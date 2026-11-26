import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import type { AuthContext } from "../common/guards/app-auth.guard";
import { PrismaService } from "../prisma/prisma.service";
import { PAYMENT_METHODS } from "./store-data";
import { StoresService } from "./stores.service";

type Tx = Prisma.TransactionClient;

export const WALLET_KINDS = ["overpay", "topup", "pay", "refund", "adjust"] as const;
export type WalletKind = (typeof WALLET_KINDS)[number];

export interface WalletMove {
  kind: WalletKind;
  reason: string;
  method?: string | null;
  orderId?: string | null;
  orderCode?: string | null;
  by?: string | null;
}

/** Lý do bắt buộc, gọn gàng: bỏ khoảng trắng thừa, 5–300 ký tự */
export function walletReason(raw: unknown): string {
  const r = String(raw ?? "")
    .replace(/\s+/g, " ")
    .trim();
  if (r.length < 5) throw new BadRequestException("Nhập lý do rõ ràng (ít nhất 5 ký tự)");
  return r.slice(0, 300);
}

/**
 * Ví khách: tiền quán đang giữ của khách (trả thừa, nạp trước) — trừ dần vào các lần thanh toán sau
 * hoặc hoàn lại cho khách. Mọi thay đổi số dư đi qua `move` để luôn có lịch sử + lý do.
 */
@Injectable()
export class WalletService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stores: StoresService,
  ) {}

  /** Cộng (+) / trừ (−) ví trong transaction; trừ quá số dư → lỗi. Trả số dư mới. */
  async move(tx: Tx, storeId: string, customerId: string, amount: number, m: WalletMove): Promise<number> {
    const amt = Math.round(amount);
    if (!amt) throw new BadRequestException("Số tiền phải khác 0");
    if (amt < 0) {
      // updateMany + điều kiện số dư → 2 lần trừ cùng lúc không làm âm ví
      const r = await tx.storeCustomer.updateMany({ where: { id: customerId, storeId, walletBalance: { gte: -amt } }, data: { walletBalance: { increment: amt } } });
      if (!r.count) {
        const c = await tx.storeCustomer.findFirst({ where: { id: customerId, storeId }, select: { walletBalance: true } });
        if (!c) throw new NotFoundException("Không tìm thấy khách hàng");
        throw new BadRequestException(`Số dư ví không đủ (còn ${c.walletBalance.toLocaleString("vi-VN")}đ)`);
      }
    } else {
      const r = await tx.storeCustomer.updateMany({ where: { id: customerId, storeId }, data: { walletBalance: { increment: amt } } });
      if (!r.count) throw new NotFoundException("Không tìm thấy khách hàng");
    }
    const { walletBalance } = await tx.storeCustomer.findUniqueOrThrow({ where: { id: customerId }, select: { walletBalance: true } });
    await tx.storeWalletTxn.create({
      data: {
        storeId,
        customerId,
        amount: amt,
        balanceAfter: walletBalance,
        kind: m.kind,
        reason: m.reason.slice(0, 300),
        method: m.method ?? null,
        orderId: m.orderId ?? null,
        orderCode: m.orderCode ?? null,
        createdBy: m.by ?? null,
      },
    });
    return walletBalance;
  }

  async history(auth: AuthContext, storeId: string, customerId: string) {
    await this.stores.ensureSection(auth, storeId, "customers", "orders", "bookings");
    const c = await this.prisma.storeCustomer.findFirst({ where: { id: customerId, storeId }, select: { walletBalance: true } });
    if (!c) throw new NotFoundException("Không tìm thấy khách hàng");
    const txns = await this.prisma.storeWalletTxn.findMany({ where: { storeId, customerId }, orderBy: { createdAt: "desc" }, take: 300 });
    return { balance: c.walletBalance, txns };
  }

  /**
   * Thao tác tay ở hồ sơ khách:
   *  topup  — khách nạp trước (+), refund — trả lại tiền cho khách (−), adjust — điều chỉnh / sửa sai (±).
   */
  async adjust(auth: AuthContext, storeId: string, customerId: string, body: { kind?: string; amount?: number; reason?: string; paymentMethod?: string }) {
    await this.stores.ensureSection(auth, storeId, "customers");
    const kind = body?.kind;
    if (kind !== "topup" && kind !== "refund" && kind !== "adjust") throw new BadRequestException("Loại giao dịch ví không hợp lệ");
    const raw = Math.round(Number(body.amount) || 0);
    if (!raw || Math.abs(raw) > 1_000_000_000) throw new BadRequestException("Nhập số tiền");
    const amount = kind === "topup" ? Math.abs(raw) : kind === "refund" ? -Math.abs(raw) : raw;
    const reason = walletReason(body.reason);
    const method = kind !== "adjust" && (PAYMENT_METHODS as readonly string[]).includes(String(body.paymentMethod)) ? String(body.paymentMethod) : null;
    const balance = await this.prisma.$transaction((tx) => this.move(tx, storeId, customerId, amount, { kind, reason, method, by: auth.email ?? null }));
    return { balance };
  }
}
