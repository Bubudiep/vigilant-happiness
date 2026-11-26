import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import type { AuthContext } from "../common/guards/app-auth.guard";
import { PrismaService } from "../prisma/prisma.service";
import { PAYMENT_METHODS, serializeBooking, serializeOrder } from "./store-data";
import { type AdminOrderInput, StoreDataService } from "./store-data.service";
import { StoresService } from "./stores.service";
import { WalletService, walletReason } from "./wallet.service";

const BILLING = ["session", "package", "flexible"] as const;
type Billing = (typeof BILLING)[number];
const method = (m: unknown) => ((PAYMENT_METHODS as readonly string[]).includes(String(m)) ? String(m) : "cash");
const money = (v: unknown) => Math.max(0, Math.round(Number(v) || 0));

/**
 * Thu tiền & công nợ:
 *  - Thu tiền lịch hẹn: bill dịch vụ + bán thêm sản phẩm + phụ thu → đơn "booking" đã hoàn thành, trả thiếu thì ghi nợ.
 *  - Liệu trình: thu theo buổi (bill từng buổi) / trọn gói / linh hoạt (đơn gói, trả dần).
 *  - Công nợ: đơn hoàn thành còn thiếu tiền; thu nợ theo đơn hoặc theo khách (trừ đơn cũ trước).
 */
@Injectable()
export class BillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stores: StoresService,
    private readonly data: StoreDataService,
    private readonly wallet: WalletService,
  ) {}

  private customerView(tx: Prisma.TransactionClient, id: string | null | undefined) {
    return id ? tx.storeCustomer.findUnique({ where: { id }, select: { id: true, walletBalance: true, totalSpent: true, totalOrders: true, points: true, tier: true } }) : null;
  }

  /** Ghi 1 lần thu tiền vào đơn (cộng paidAmount, không vượt tổng) */
  private async pay(tx: Prisma.TransactionClient, storeId: string, orderId: string, amount: number, m: string, note?: string) {
    const o = await tx.storeOrder.findFirst({ where: { id: orderId, storeId } });
    if (!o) throw new NotFoundException("Không tìm thấy đơn");
    const amt = Math.min(money(amount), Math.max(0, o.totalAmount - o.paidAmount));
    if (!amt) return 0;
    await tx.storeOrder.update({ where: { id: o.id }, data: { paidAmount: o.paidAmount + amt } });
    await tx.storePayment.create({ data: { storeId, orderId: o.id, customerId: o.customerId, amount: amt, method: m, note: note ?? null } });
    return amt;
  }

  // ───────────── Thu tiền lịch hẹn ─────────────

  /**
   * body: { items: [{ productId?, productName?, unitPrice?, quantity }], extraDiscount?, paymentMethod?, paid?, treatmentPaid?, result?, note? }
   * items rỗng (VD buổi đã gồm trong gói) → chỉ đánh dấu hoàn thành (+ thu nợ gói nếu có).
   */
  async checkoutBooking(
    auth: AuthContext,
    storeId: string,
    bookingId: string,
    body: {
      items?: AdminOrderInput["items"];
      extraDiscount?: number;
      voucherCode?: string;
      paymentMethod?: string;
      paid?: number;
      treatmentPaid?: number;
      result?: string;
      note?: string;
      /** Trừ ví khách vào bill */
      walletUse?: number;
      /** Khách trả thừa → cộng phần thừa vào ví (không thì coi như đã thối lại) */
      overpayToWallet?: boolean;
      walletReason?: string;
    },
  ) {
    await this.stores.ensureSection(auth, storeId, "bookings", "orders");
    const m = method(body?.paymentMethod);
    return this.prisma.$transaction(async (tx) => {
      const b = await tx.storeBooking.findFirst({ where: { id: bookingId, storeId } });
      if (!b) throw new NotFoundException("Không tìm thấy lịch hẹn");
      const paidOrder = await tx.storeOrder.findFirst({ where: { storeId, bookingId: b.id, status: { not: "cancelled" } }, select: { code: true } });
      if (paidOrder) throw new BadRequestException(`Lịch hẹn đã được thu tiền (đơn ${paidOrder.code})`);

      const items = Array.isArray(body?.items) ? body.items : [];
      const walletUse = money(body?.walletUse);
      if ((walletUse || body?.overpayToWallet) && !b.customerId) throw new BadRequestException("Khách chưa có hồ sơ khách hàng nên chưa dùng ví được");
      const by = auth.email ?? null;
      let order: ReturnType<typeof serializeOrder> | null = null;
      if (items.length) {
        const created = await this.data.createOrderTx(
          tx,
          storeId,
          {
            customerId: b.customerId ?? undefined,
            customerName: b.customerName,
            phone: b.phone,
            items,
            extraDiscount: body.extraDiscount,
            voucherCode: typeof body.voucherCode === "string" ? body.voucherCode : undefined,
            paymentMethod: m,
            status: "completed",
            note: [`Lịch hẹn ${b.code} · ${b.serviceName}`, body.note?.trim()].filter(Boolean).join(" — "),
          },
          "booking",
          // paid = tiền khách đưa (mặc định đủ phần còn lại sau khi trừ ví) + phần trừ ví
          { paid: body.paid === undefined || body.paid === null ? undefined : money(body.paid) + walletUse, bookingId: b.id, treatmentId: b.treatmentId ?? undefined },
        );
        order = created;
        const walletPart = Math.min(walletUse, created.total);
        const cashIn = body.paid === undefined || body.paid === null ? created.total - walletPart : money(body.paid);
        const cashPart = Math.max(0, created.paid - walletPart);
        if (walletPart > 0) {
          await this.wallet.move(tx, storeId, b.customerId!, -walletPart, { kind: "pay", reason: `Trừ vào đơn ${created.code} (lịch hẹn ${b.code})`, orderId: created.id, orderCode: created.code, by });
          await tx.storePayment.create({ data: { storeId, orderId: created.id, customerId: created.customerId, amount: walletPart, method: "wallet", note: "Trừ ví khách" } });
        }
        if (cashPart > 0) {
          await tx.storePayment.create({
            data: { storeId, orderId: created.id, customerId: created.customerId, amount: cashPart, method: m, note: `Thu tiền lịch hẹn ${b.code}` },
          });
        }
        // Trả thừa → quán đang nợ khách: cộng vào ví (kèm lý do)
        const excess = Math.max(0, cashIn - (created.total - walletPart));
        if (excess > 0 && body.overpayToWallet) {
          const reason = body.walletReason?.trim() ? walletReason(body.walletReason) : `Khách trả thừa khi thanh toán lịch hẹn ${b.code} (đơn ${created.code})`;
          await this.wallet.move(tx, storeId, b.customerId!, excess, { kind: "overpay", reason, method: m, orderId: created.id, orderCode: created.code, by });
        }
      }
      // Thu thêm nợ gói liệu trình (trọn gói / linh hoạt)
      if (b.treatmentId && money(body?.treatmentPaid)) {
        const t = await tx.storeTreatment.findFirst({ where: { id: b.treatmentId, storeId } });
        if (t?.orderId) await this.pay(tx, storeId, t.orderId, money(body.treatmentPaid), m, `Thu gói liệu trình — buổi ${b.treatmentSeq}`);
      }
      const booking = await tx.storeBooking.update({
        where: { id: b.id },
        data: { status: "completed", ...(typeof body?.result === "string" && body.result.trim() ? { result: body.result.trim().slice(0, 2000) } : {}) },
      });
      return { order, booking: serializeBooking(booking), customer: await this.customerView(tx, b.customerId) };
    });
  }

  // ───────────── Liệu trình ─────────────

  async treatments(auth: AuthContext, storeId: string) {
    await this.stores.ensureSection(auth, storeId, "bookings", "customers");
    const list = await this.prisma.storeTreatment.findMany({ where: { storeId }, orderBy: { createdAt: "desc" }, take: 1000 });
    const orders = await this.prisma.storeOrder.findMany({
      where: { storeId, id: { in: list.map((t) => t.orderId).filter((x): x is string => !!x) } },
      select: { id: true, code: true, totalAmount: true, paidAmount: true, status: true },
    });
    const byId = new Map(orders.map((o) => [o.id, o]));
    return list.map((t) => {
      const o = t.orderId ? byId.get(t.orderId) : undefined;
      return {
        id: t.id,
        name: t.name,
        billing: t.billing,
        price: t.price,
        orderId: t.orderId,
        orderCode: o?.code,
        paid: o?.paidAmount ?? 0,
        debt: o && o.status !== "cancelled" ? Math.max(0, o.totalAmount - o.paidAmount) : 0,
      };
    });
  }

  /**
   * Tạo / đổi cách thu tiền của liệu trình. package / flexible + giá > 0 → tạo đơn gói (hoàn thành), khách trả trước `paid`
   * (package mặc định trả đủ, flexible mặc định 0) — phần còn lại là công nợ.
   */
  async saveTreatment(
    auth: AuthContext,
    storeId: string,
    body: { treatmentId?: string; customerName?: string; phone?: string; name?: string; billing?: string; price?: number; paid?: number; paymentMethod?: string },
  ) {
    await this.stores.ensureSection(auth, storeId, "bookings");
    const id = String(body?.treatmentId ?? "").trim();
    if (!id || id.length > 60) throw new BadRequestException("Thiếu mã liệu trình");
    const billing: Billing = (BILLING as readonly string[]).includes(String(body.billing)) ? (body.billing as Billing) : "session";
    const price = money(body.price);
    const name = String(body.name ?? "").trim().slice(0, 200) || "Liệu trình";
    const m = method(body.paymentMethod);
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.storeTreatment.findFirst({ where: { id } });
      if (existing && existing.storeId !== storeId) throw new BadRequestException("Mã liệu trình không hợp lệ");
      const phone = String(body.phone ?? existing?.phone ?? "").trim();
      const customer = phone ? await tx.storeCustomer.findFirst({ where: { storeId, phone }, select: { id: true, name: true } }) : null;
      const t = await tx.storeTreatment.upsert({
        where: { id },
        create: { id, storeId, customerId: customer?.id ?? null, customerName: customer?.name ?? (String(body.customerName ?? "").trim() || "Khách"), phone, name, billing, price },
        update: { billing, price, name },
      });
      let orderId = t.orderId;
      if (billing !== "session" && price > 0 && !orderId) {
        const created = await this.data.createOrderTx(
          tx,
          storeId,
          {
            customerId: customer?.id,
            customerName: t.customerName,
            phone: t.phone,
            items: [{ productName: `Gói ${name}`, unitPrice: price, quantity: 1 }],
            paymentMethod: m,
            status: "completed",
            note: billing === "package" ? "Thu trọn gói liệu trình" : "Liệu trình trả linh hoạt",
          },
          "treatment",
          { paid: body.paid ?? (billing === "package" ? price : 0), treatmentId: id },
        );
        orderId = created.id;
        await tx.storeTreatment.update({ where: { id }, data: { orderId } });
        if (created.paid > 0) {
          await tx.storePayment.create({
            data: { storeId, orderId, customerId: created.customerId, amount: created.paid, method: m, note: `Trả trước gói ${name}` },
          });
        }
      }
      return { id, billing, price, orderId };
    });
  }

  /** Lịch sử thu tiền của 1 đơn (các lần thu, trừ ví) — khung chi tiết đơn */
  async orderPayments(auth: AuthContext, storeId: string, orderId: string) {
    await this.stores.ensureSection(auth, storeId, "orders", "customers");
    const o = await this.prisma.storeOrder.findFirst({ where: { id: orderId, storeId }, select: { id: true, totalAmount: true, paidAmount: true, status: true } });
    if (!o) throw new NotFoundException("Không tìm thấy đơn");
    const payments = await this.prisma.storePayment.findMany({ where: { storeId, orderId }, orderBy: { createdAt: "asc" } });
    return {
      total: o.totalAmount,
      paid: o.paidAmount,
      debt: o.status === "completed" ? Math.max(0, o.totalAmount - o.paidAmount) : 0,
      payments: payments.map((p) => ({ id: p.id, amount: p.amount, method: p.method, note: p.note, createdAt: p.createdAt.toISOString() })),
    };
  }

  // ───────────── Công nợ ─────────────

  /** Khách còn nợ: gom các đơn hoàn thành chưa thu đủ theo khách (có customerId thì theo khách, không thì theo SĐT) */
  async debts(auth: AuthContext, storeId: string) {
    await this.stores.ensureSection(auth, storeId, "customers", "orders");
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "StoreOrder" WHERE "storeId" = ${storeId} AND status = 'completed' AND "paidAmount" < "totalAmount"
      ORDER BY "createdAt" ASC LIMIT 2000`;
    const orders = await this.prisma.storeOrder.findMany({
      where: { id: { in: rows.map((r) => r.id) } },
      include: { items: true, payments: { orderBy: { createdAt: "desc" }, take: 10 } },
      orderBy: { createdAt: "asc" },
    });
    const groups = new Map<string, { key: string; customerId: string | null; customerName: string; phone: string; debt: number; orders: unknown[] }>();
    for (const o of orders) {
      const key = o.customerId ?? `phone:${o.phone}`;
      const g = groups.get(key) ?? { key, customerId: o.customerId, customerName: o.customerName, phone: o.phone, debt: 0, orders: [] };
      g.debt += o.totalAmount - o.paidAmount;
      g.orders.push({
        ...serializeOrder(o),
        debt: o.totalAmount - o.paidAmount,
        payments: o.payments.map((p) => ({ id: p.id, amount: p.amount, method: p.method, note: p.note, createdAt: p.createdAt.toISOString() })),
      });
      groups.set(key, g);
    }
    return [...groups.values()].sort((a, b) => b.debt - a.debt);
  }

  /** Thu nợ: theo 1 đơn (orderId) hoặc theo khách (customerId / phone — trừ đơn cũ trước) */
  async collect(
    auth: AuthContext,
    storeId: string,
    body: {
      orderId?: string;
      customerId?: string;
      phone?: string;
      amount?: number;
      paymentMethod?: string;
      note?: string;
      /** Trừ ví khách để trả nợ */
      walletUse?: number;
      /** Thu dư → cộng phần dư vào ví */
      overpayToWallet?: boolean;
      walletReason?: string;
    },
  ) {
    await this.stores.ensureSection(auth, storeId, "customers", "orders");
    let left = money(body?.amount);
    let walletLeft = money(body?.walletUse);
    if (!left && !walletLeft) throw new BadRequestException("Nhập số tiền thu");
    const m = method(body.paymentMethod);
    return this.prisma.$transaction(async (tx) => {
      const where: Prisma.StoreOrderWhereInput = body.orderId
        ? { id: body.orderId, storeId }
        : body.customerId
          ? { storeId, customerId: body.customerId }
          : body.phone
            ? { storeId, phone: body.phone, customerId: null }
            : (() => {
                throw new BadRequestException("Chọn đơn hoặc khách để thu nợ");
              })();
      const list = (await tx.storeOrder.findMany({ where: { ...where, status: "completed" }, orderBy: { createdAt: "asc" } })).filter(
        (o) => o.paidAmount < o.totalAmount,
      );
      if (!list.length) throw new BadRequestException("Không còn khoản nợ nào");
      const customerId = body.customerId ?? list[0].customerId;
      if ((walletLeft || body.overpayToWallet) && !customerId) throw new BadRequestException("Khách chưa có hồ sơ khách hàng nên chưa dùng ví được");
      const by = auth.email ?? null;
      let collected = 0;
      let fromWallet = 0;
      const codes: string[] = [];
      for (const o of list) {
        if (!left && !walletLeft) break;
        // Trừ ví trước, phần còn lại thu tiền mặt / chuyển khoản
        const w = walletLeft ? await this.pay(tx, storeId, o.id, walletLeft, "wallet", "Trừ ví khách — thu nợ") : 0;
        walletLeft -= w;
        fromWallet += w;
        const c = left ? await this.pay(tx, storeId, o.id, left, m, body.note?.trim() || "Thu nợ") : 0;
        left -= c;
        collected += w + c;
        if (w + c) codes.push(o.code);
      }
      if (fromWallet) {
        await this.wallet.move(tx, storeId, customerId!, -fromWallet, { kind: "pay", reason: `Trừ ví trả nợ đơn ${codes.join(", ")}`.slice(0, 300), orderCode: codes[0] ?? null, by });
      }
      let toWallet = 0;
      if (left > 0 && body.overpayToWallet) {
        const reason = body.walletReason?.trim() ? walletReason(body.walletReason) : `Khách trả dư khi thu nợ đơn ${codes.join(", ")}`.slice(0, 300);
        await this.wallet.move(tx, storeId, customerId!, left, { kind: "overpay", reason, method: m, orderCode: codes[0] ?? null, by });
        toWallet = left;
        left = 0;
      }
      return { collected, fromWallet, toWallet, change: left, customer: await this.customerView(tx, customerId) };
    });
  }
}
