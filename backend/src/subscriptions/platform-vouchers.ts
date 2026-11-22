import { BadRequestException } from "@nestjs/common";
import type { Prisma, PlatformVoucher } from "@prisma/client";

/** Dữ liệu voucher nền tảng gửi lên từ Trang điều hành. */
export interface PlatformVoucherInput {
  code?: string;
  title?: string;
  discountType?: string;
  discountValue?: number;
  maxDiscount?: number;
  minAmount?: number;
  planIds?: string[];
  billingCycle?: string;
  quantity?: number;
  startDate?: string | null;
  endDate?: string | null;
  active?: boolean;
  note?: string | null;
}

const int = (v: unknown, name: string, min = 0) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n < min) throw new BadRequestException(`${name} phải là số nguyên ≥ ${min}`);
  return n;
};
const date = (v: string, name: string) => {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) throw new BadRequestException(`${name} không hợp lệ`);
  return d;
};

/** Kiểm tra & chuẩn hoá. `partial` = sửa (chỉ trường có gửi). */
export function cleanVoucher(dto: PlatformVoucherInput, partial: boolean): Prisma.PlatformVoucherUncheckedUpdateInput {
  const out: Prisma.PlatformVoucherUncheckedUpdateInput = {};
  if (dto.code !== undefined || !partial) {
    const code = String(dto.code ?? "").trim().toUpperCase();
    if (!/^[A-Z0-9_-]{3,30}$/.test(code)) throw new BadRequestException("Mã voucher 3–30 ký tự: chữ, số, - hoặc _");
    out.code = code;
  }
  if (dto.title !== undefined || !partial) {
    const title = String(dto.title ?? "").trim().slice(0, 120);
    if (!title) throw new BadRequestException("Nhập tên voucher");
    out.title = title;
  }
  if (dto.discountType !== undefined) {
    if (!["percent", "fixed"].includes(dto.discountType)) throw new BadRequestException("Loại giảm: percent | fixed");
    out.discountType = dto.discountType;
  }
  if (dto.discountValue !== undefined) out.discountValue = int(dto.discountValue, "Mức giảm");
  if (dto.maxDiscount !== undefined) out.maxDiscount = int(dto.maxDiscount, "Giảm tối đa");
  if (dto.minAmount !== undefined) out.minAmount = int(dto.minAmount, "Đơn tối thiểu");
  if (dto.quantity !== undefined) out.quantity = int(dto.quantity, "Số lượt", 1);
  if (dto.planIds !== undefined) {
    if (!Array.isArray(dto.planIds)) throw new BadRequestException("planIds phải là danh sách");
    out.planIds = dto.planIds.map(String).slice(0, 50);
  }
  if (dto.billingCycle !== undefined) {
    if (!["all", "monthly", "yearly"].includes(dto.billingCycle)) throw new BadRequestException("Chu kỳ: all | monthly | yearly");
    out.billingCycle = dto.billingCycle;
  }
  if (dto.startDate) out.startDate = date(dto.startDate, "Ngày bắt đầu");
  if (dto.endDate !== undefined) out.endDate = dto.endDate ? date(dto.endDate, "Ngày hết hạn") : null;
  if (dto.active !== undefined) out.active = !!dto.active;
  if (dto.note !== undefined) out.note = dto.note?.trim().slice(0, 500) || null;
  return out;
}

/** Tính số tiền giảm; ném lỗi tiếng Việt nếu không áp được. */
export function quotePlatformVoucher(v: PlatformVoucher | null, ctx: { planId: string; billingCycle: string; amount: number }) {
  if (!v) throw new BadRequestException("Mã voucher không tồn tại");
  const now = new Date();
  if (!v.active) throw new BadRequestException("Voucher đang tắt");
  if (v.startDate > now) throw new BadRequestException("Voucher chưa đến ngày áp dụng");
  if (v.endDate && v.endDate < now) throw new BadRequestException("Voucher đã hết hạn");
  if (v.usedCount >= v.quantity) throw new BadRequestException("Voucher đã hết lượt");
  if (v.planIds.length && !v.planIds.includes(ctx.planId)) throw new BadRequestException("Voucher không áp dụng cho gói này");
  if (v.billingCycle !== "all" && v.billingCycle !== ctx.billingCycle)
    throw new BadRequestException(`Voucher chỉ áp cho gói ${v.billingCycle === "yearly" ? "theo năm" : "theo tháng"}`);
  if (ctx.amount < v.minAmount) throw new BadRequestException(`Đơn tối thiểu ${v.minAmount.toLocaleString("vi-VN")}đ`);
  let discount = v.discountType === "fixed" ? v.discountValue : Math.floor((ctx.amount * Math.min(100, v.discountValue)) / 100);
  if (v.discountType === "percent" && v.maxDiscount > 0) discount = Math.min(discount, v.maxDiscount);
  discount = Math.max(0, Math.min(discount, ctx.amount));
  return { code: v.code, title: v.title, discount, finalAmount: ctx.amount - discount };
}
