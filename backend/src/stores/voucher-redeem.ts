import { BadRequestException } from "@nestjs/common";
import { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

/** Kết quả áp voucher: số tiền giảm + cách đánh dấu đã dùng sau khi có đơn. */
export interface VoucherQuote {
  voucherId: string;
  code: string;
  title: string;
  discount: number;
  /** Mã dùng 1 lần (thẻ in) — null nếu là mã chung của chương trình */
  codeId: string | null;
}

/**
 * Tính giảm giá của mã voucher cho một đơn (chưa ghi gì vào DB).
 * Mã có thể là mã chung của chương trình (StoreVoucher.code, giới hạn theo quantity)
 * hoặc mã in trên thẻ (StoreVoucherCode, mỗi mã dùng 1 lần).
 */
export async function quoteVoucher(
  tx: Tx,
  storeId: string,
  rawCode: string,
  ctx: { subtotal: number; shippingFee: number; tierName?: string | null },
): Promise<VoucherQuote> {
  const code = rawCode.trim().toUpperCase().replace(/\s+/g, "");
  if (!code) throw new BadRequestException("Chưa nhập mã voucher");

  const single = await tx.storeVoucherCode.findUnique({ where: { storeId_code: { storeId, code } }, include: { voucher: true } });
  const voucher = single?.voucher ?? (await tx.storeVoucher.findUnique({ where: { storeId_code: { storeId, code } } }));
  if (!voucher) throw new BadRequestException(`Mã "${code}" không tồn tại`);
  if (single?.usedAt) throw new BadRequestException(`Mã "${code}" đã được sử dụng${single.orderCode ? ` (đơn ${single.orderCode})` : ""}`);
  if (!voucher.active) throw new BadRequestException("Chương trình voucher đang tạm tắt");

  const now = new Date();
  const end = new Date(voucher.endDate);
  end.setHours(23, 59, 59, 999);
  if (now < voucher.startDate) throw new BadRequestException("Voucher chưa đến ngày áp dụng");
  if (now > end) throw new BadRequestException("Voucher đã hết hạn");
  if (!single && voucher.usedCount >= voucher.quantity) throw new BadRequestException("Voucher đã hết lượt sử dụng");
  if (ctx.subtotal < voucher.minOrderValue) {
    throw new BadRequestException(`Đơn tối thiểu ${voucher.minOrderValue.toLocaleString("vi-VN")}đ để dùng mã này`);
  }
  if (voucher.tierCode && voucher.tierCode !== "all") {
    const tier = await tx.storeMemberTier.findFirst({ where: { storeId, code: voucher.tierCode } });
    if (tier && tier.name !== ctx.tierName) throw new BadRequestException(`Mã chỉ dành cho hạng ${tier.name}`);
  }

  let discount =
    voucher.discountType === "percent"
      ? Math.floor((ctx.subtotal * voucher.discountValue) / 100)
      : voucher.discountType === "freeship"
        ? Math.min(voucher.discountValue, ctx.shippingFee)
        : voucher.discountValue;
  if (voucher.maxDiscount && voucher.discountType !== "freeship") discount = Math.min(discount, voucher.maxDiscount);
  discount = Math.max(0, Math.min(discount, ctx.subtotal + ctx.shippingFee));

  return { voucherId: voucher.id, code, title: voucher.title, discount, codeId: single?.id ?? null };
}

/** Ghi nhận đã dùng mã (gọi trong cùng transaction tạo đơn). */
export async function markVoucherUsed(tx: Tx, q: VoucherQuote, order: { id: string; code: string }) {
  if (q.codeId) {
    // updateMany + điều kiện usedAt=null để 2 đơn cùng lúc không dùng chung 1 mã
    const r = await tx.storeVoucherCode.updateMany({
      where: { id: q.codeId, usedAt: null },
      data: { usedAt: new Date(), orderId: order.id, orderCode: order.code },
    });
    if (!r.count) throw new BadRequestException(`Mã "${q.code}" vừa được sử dụng ở đơn khác`);
  }
  await tx.storeVoucher.update({ where: { id: q.voucherId }, data: { usedCount: { increment: 1 } } });
}

/** Huỷ đơn có dùng mã → trả lại lượt cho voucher / mở lại mã thẻ. */
export async function releaseVoucher(tx: Tx, storeId: string, order: { id: string; voucherCode: string | null }) {
  if (!order.voucherCode) return;
  const single = await tx.storeVoucherCode.findFirst({ where: { storeId, orderId: order.id } });
  if (single) await tx.storeVoucherCode.update({ where: { id: single.id }, data: { usedAt: null, orderId: null, orderCode: null } });
  const voucherId =
    single?.voucherId ??
    (await tx.storeVoucher.findUnique({ where: { storeId_code: { storeId, code: order.voucherCode } }, select: { id: true } }))?.id;
  if (voucherId) {
    await tx.storeVoucher.updateMany({ where: { id: voucherId, usedCount: { gt: 0 } }, data: { usedCount: { decrement: 1 } } });
  }
}

/** Mở lại đơn đã huỷ → giữ lại mã như lúc đặt (lỗi nếu mã thẻ đã bị đơn khác dùng). */
export async function reclaimVoucher(tx: Tx, storeId: string, order: { id: string; code: string; voucherCode: string | null }) {
  if (!order.voucherCode) return;
  const single = await tx.storeVoucherCode.findUnique({ where: { storeId_code: { storeId, code: order.voucherCode } } });
  const voucherId =
    single?.voucherId ??
    (await tx.storeVoucher.findUnique({ where: { storeId_code: { storeId, code: order.voucherCode } }, select: { id: true } }))?.id;
  if (!voucherId) return;
  await markVoucherUsed(tx, { voucherId, code: order.voucherCode, title: "", discount: 0, codeId: single?.id ?? null }, order);
}
