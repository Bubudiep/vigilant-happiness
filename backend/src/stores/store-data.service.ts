import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { AuthContext } from "../common/guards/app-auth.guard";
import { normalizeVnPhone } from "../oauth/zalo.service";
import { PrismaService } from "../prisma/prisma.service";
import {
  makeCode,
  pickFields,
  randomVoucherCode,
  serializeBooking,
  serializeDocument,
  serializeEvent,
  serializeOrder,
  serializeStaff,
  serializeTier,
  serializeVoucher,
  SPECS,
} from "./store-data";
import { markVoucherUsed, quoteVoucher, reclaimVoucher, releaseVoucher } from "./voucher-redeem";
import { parseStampProgram, readStampProgram, stampsForOrder } from "./stamps";
import { loadWithIngredients, moveStockForOrder, unitCostOf } from "./inventory";
import { applyOptions, readOptions, type OptionSelection } from "./options";
import { StoresService } from "./stores.service";

export const COLLECTIONS = ["bookings", "events", "documents", "member-tiers", "vouchers", "orders", "staff"] as const;
export type Collection = (typeof COLLECTIONS)[number];

/**
 * Dữ liệu vận hành của từng gian hàng (lịch hẹn, sự kiện, tài liệu, hạng, voucher, đơn hàng).
 * Mọi truy vấn đều lọc theo storeId sau khi đã kiểm tra quyền trên store.
 */
/** Mục menu web quản trị tương ứng từng loại dữ liệu (tài khoản nhân viên cần được cấp 1 trong các mục) */
const COL_SECTIONS: Record<Collection, string[]> = {
  bookings: ["bookings", "overview"],
  events: ["events"],
  documents: ["documents"],
  "member-tiers": ["loyalty"],
  vouchers: ["loyalty"],
  orders: ["orders", "pos"],
  staff: ["staff"],
};
/** Khoá menu hợp lệ để cấp cho tài khoản nhân viên */
export const ADMIN_SECTIONS = [
  "overview", "pos", "orders", "bookings", "events", "products", "staff", "customers", "loyalty", "oainbox",
  "miniapp", "albums", "media", "documents", "reports", "settings", "support",
];

/** Tài khoản web của nhân viên: email chữ thường, mục hợp lệ. Chỉ chủ shop (mine = null) được đặt. */
function staffLogin(d: Record<string, unknown>, mine: string[] | null) {
  if (mine) {
    delete d.loginEmail;
    delete d.adminSections;
    return d;
  }
  if (d.loginEmail !== undefined) {
    const e = String(d.loginEmail ?? "").trim().toLowerCase();
    if (e && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) throw new BadRequestException("Email đăng nhập không hợp lệ");
    d.loginEmail = e || null;
  }
  if (d.adminSections !== undefined)
    d.adminSections = Array.isArray(d.adminSections) ? [...new Set((d.adminSections as string[]).filter((k) => ADMIN_SECTIONS.includes(k)))] : [];
  return d;
}

@Injectable()
export class StoreDataService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stores: StoresService,
  ) {}

  /** Toàn bộ dữ liệu vận hành của store, đúng dạng web quản trị. */
  async loadAll(storeId: string, mine: string[] | null = null) {
    const [bookings, events, documents, memberTiers, vouchers, orders, staff] = await Promise.all([
      this.prisma.storeBooking.findMany({ where: { storeId }, orderBy: [{ bookingDate: "desc" }, { createdAt: "desc" }], take: 500 }),
      this.prisma.storeEvent.findMany({ where: { storeId }, orderBy: { startDate: "desc" } }),
      this.prisma.storeDocument.findMany({ where: { storeId }, orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }] }),
      this.prisma.storeMemberTier.findMany({ where: { storeId }, orderBy: [{ sortOrder: "asc" }, { minSpent: "asc" }] }),
      this.prisma.storeVoucher.findMany({ where: { storeId }, orderBy: { createdAt: "desc" } }),
      this.prisma.storeOrder.findMany({ where: { storeId }, include: { items: true }, orderBy: { createdAt: "desc" }, take: 500 }),
      this.prisma.storeStaff.findMany({ where: { storeId }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
    ]);
    const codeStats = await this.codeStats(storeId);
    return {
      bookings: bookings.map(serializeBooking),
      events: events.map(serializeEvent),
      documents: documents.map(serializeDocument),
      memberTiers: memberTiers.map(serializeTier),
      vouchers: vouchers.map((v) => ({ ...serializeVoucher(v), ...(codeStats.get(v.id) ?? { codeCount: 0, codeUsed: 0 }) })),
      orders: orders.map(serializeOrder),
      // Nhân viên không có mục Nhân sự: chỉ thấy tên / ca (để phân lịch), không thấy lương & tài khoản web
      staff: staff.map((m) => {
        const x = serializeStaff(m);
        if (!mine || mine.includes("staff")) return x;
        const { baseSalary: _b, commissionPercent: _c, loginEmail: _e, adminSections: _a, phone: _p, birthday: _d, note: _n, ...pub } = x as Record<string, unknown>;
        return pub;
      }),
    };
  }

  async create(auth: AuthContext, storeId: string, col: Collection, body: unknown) {
    const mine = await this.stores.ensureSection(auth, storeId, ...COL_SECTIONS[col]);
    try {
      switch (col) {
        case "bookings": {
          const d = pickFields(body, SPECS.bookings, ["customerName", "phone", "serviceName", "date", "timeSlot"]);
          const phone = normalizeVnPhone(String(d.phone)) ?? String(d.phone);
          const customer = await this.prisma.storeCustomer.findFirst({ where: { storeId, phone }, select: { id: true } });
          const { date, ...rest } = d;
          const b = await this.prisma.storeBooking.create({
            data: {
              ...(rest as Omit<Prisma.StoreBookingUncheckedCreateInput, "storeId" | "code" | "bookingDate">),
              phone,
              storeId,
              code: makeCode("LH"),
              bookingDate: date as Date,
              customerId: customer?.id ?? null,
            },
          });
          return serializeBooking(b);
        }
        case "events": {
          const d = pickFields(body, SPECS.events, ["title", "startDate", "endDate"]);
          return serializeEvent(await this.prisma.storeEvent.create({ data: { ...(d as Prisma.StoreEventUncheckedCreateInput), storeId } }));
        }
        case "documents": {
          const d = pickFields(body, SPECS.documents, ["slug", "title", "content"]);
          return serializeDocument(
            await this.prisma.storeDocument.create({ data: { ...(d as Prisma.StoreDocumentUncheckedCreateInput), storeId } }),
          );
        }
        case "member-tiers": {
          const d = pickFields(body, SPECS.memberTiers, ["code", "name"]);
          return serializeTier(
            await this.prisma.storeMemberTier.create({ data: { ...(d as Prisma.StoreMemberTierUncheckedCreateInput), storeId } }),
          );
        }
        case "vouchers": {
          const d = pickFields(body, SPECS.vouchers, ["code", "title", "startDate", "endDate"]);
          d.code = String(d.code).toUpperCase();
          await this.ensureCodeFree(storeId, String(d.code));
          return serializeVoucher(
            await this.prisma.storeVoucher.create({ data: { ...(d as Prisma.StoreVoucherUncheckedCreateInput), storeId } }),
          );
        }
        case "orders":
          return this.createOrder(storeId, body as AdminOrderInput);
        case "staff": {
          const d = staffLogin(pickFields(body, SPECS.staff, ["name"]), mine);
          if (d.attendanceCode === "") d.attendanceCode = null;
          if (d.phone) d.phone = normalizeVnPhone(String(d.phone)) ?? d.phone;
          return serializeStaff(
            await this.prisma.storeStaff.create({ data: { ...(d as Prisma.StoreStaffUncheckedCreateInput), storeId } }),
          );
        }
      }
    } catch (e) {
      throw this.mapError(e);
    }
  }

  async update(auth: AuthContext, storeId: string, col: Collection, id: string, body: unknown) {
    const mine = await this.stores.ensureSection(auth, storeId, ...COL_SECTIONS[col]);
    try {
      switch (col) {
        case "bookings": {
          const { date, ...rest } = pickFields(body, SPECS.bookings);
          await this.mustUpdate(
            this.prisma.storeBooking.updateMany({
              where: { id, storeId },
              data: { ...(rest as Prisma.StoreBookingUpdateManyMutationInput), ...(date ? { bookingDate: date as Date } : {}) },
            }),
          );
          return serializeBooking(await this.prisma.storeBooking.findUniqueOrThrow({ where: { id } }));
        }
        case "events":
          await this.mustUpdate(this.prisma.storeEvent.updateMany({ where: { id, storeId }, data: pickFields(body, SPECS.events) }));
          return serializeEvent(await this.prisma.storeEvent.findUniqueOrThrow({ where: { id } }));
        case "documents":
          await this.mustUpdate(this.prisma.storeDocument.updateMany({ where: { id, storeId }, data: pickFields(body, SPECS.documents) }));
          return serializeDocument(await this.prisma.storeDocument.findUniqueOrThrow({ where: { id } }));
        case "member-tiers":
          await this.mustUpdate(this.prisma.storeMemberTier.updateMany({ where: { id, storeId }, data: pickFields(body, SPECS.memberTiers) }));
          return serializeTier(await this.prisma.storeMemberTier.findUniqueOrThrow({ where: { id } }));
        case "vouchers": {
          const d = pickFields(body, SPECS.vouchers);
          if (d.code) d.code = String(d.code).toUpperCase();
          await this.mustUpdate(this.prisma.storeVoucher.updateMany({ where: { id, storeId }, data: d }));
          return serializeVoucher(await this.prisma.storeVoucher.findUniqueOrThrow({ where: { id } }));
        }
        case "orders":
          return this.updateOrder(storeId, id, pickFields(body, SPECS.orders));
        case "staff": {
          const d = staffLogin(pickFields(body, SPECS.staff), mine);
          if (d.attendanceCode === "") d.attendanceCode = null;
          if (d.phone) d.phone = normalizeVnPhone(String(d.phone)) ?? d.phone;
          if (d.name === "") throw new BadRequestException("Thiếu tên nhân viên");
          await this.mustUpdate(this.prisma.storeStaff.updateMany({ where: { id, storeId }, data: d as Prisma.StoreStaffUpdateManyMutationInput }));
          return serializeStaff(await this.prisma.storeStaff.findUniqueOrThrow({ where: { id } }));
        }
      }
    } catch (e) {
      throw this.mapError(e);
    }
  }

  async remove(auth: AuthContext, storeId: string, col: Collection, id: string) {
    await this.stores.ensureSection(auth, storeId, ...COL_SECTIONS[col]);
    const where = { id, storeId };
    const res =
      col === "bookings"
        ? await this.prisma.storeBooking.deleteMany({ where })
        : col === "events"
          ? await this.prisma.storeEvent.deleteMany({ where })
          : col === "documents"
            ? await this.prisma.storeDocument.deleteMany({ where })
            : col === "member-tiers"
              ? await this.prisma.storeMemberTier.deleteMany({ where })
              : col === "vouchers"
                ? await this.prisma.storeVoucher.deleteMany({ where })
                : col === "staff"
                  ? await this.prisma.storeStaff.deleteMany({ where })
                  : await this.prisma.storeOrder.deleteMany({ where });
    if (!res.count) throw new NotFoundException("Không tìm thấy dữ liệu");
    return { id, deleted: true };
  }

  // ───────────── Thẻ tích tem ─────────────

  async saveStampProgram(auth: AuthContext, storeId: string, body: unknown) {
    await this.stores.ensureSection(auth, storeId, "loyalty");
    const program = parseStampProgram(body);
    if (program.productIds.length) {
      const n = await this.prisma.storeProduct.count({ where: { storeId, id: { in: program.productIds } } });
      if (n !== program.productIds.length) throw new BadRequestException("Có sản phẩm không thuộc cửa hàng");
    }
    await this.prisma.store.update({ where: { id: storeId }, data: { stampProgram: program as unknown as Prisma.InputJsonValue } });
    return program;
  }

  /**
   * Tem của 1 khách: { action: "redeem" } đổi quà (trừ đủ số tem), { action: "adjust", delta } cộng / trừ tay.
   */
  async customerStamps(auth: AuthContext, storeId: string, customerId: string, body: { action?: string; delta?: number }) {
    await this.stores.ensureSection(auth, storeId, "customers", "loyalty", "pos");
    const [store, c] = await Promise.all([
      this.prisma.store.findUnique({ where: { id: storeId }, select: { stampProgram: true } }),
      this.prisma.storeCustomer.findFirst({ where: { id: customerId, storeId } }),
    ]);
    if (!c) throw new NotFoundException("Không tìm thấy khách hàng");
    const program = readStampProgram(store?.stampProgram);
    if (!program) throw new BadRequestException("Cửa hàng chưa thiết lập thẻ tích tem");
    let data: Prisma.StoreCustomerUpdateInput;
    if (body?.action === "redeem") {
      if (c.stamps < program.required) throw new BadRequestException(`Khách mới có ${c.stamps}/${program.required} tem`);
      data = { stamps: c.stamps - program.required, stampRewards: c.stampRewards + 1 };
    } else if (body?.action === "adjust") {
      const delta = Math.round(Number(body.delta));
      if (!Number.isFinite(delta) || !delta || Math.abs(delta) > 500) throw new BadRequestException("Số tem điều chỉnh không hợp lệ");
      data = { stamps: Math.max(0, c.stamps + delta) };
    } else throw new BadRequestException("Thao tác không hợp lệ");
    const saved = await this.prisma.storeCustomer.update({ where: { id: c.id }, data });
    return { id: saved.id, stamps: saved.stamps, stampRewards: saved.stampRewards };
  }

  // ───────────── Mã voucher dùng 1 lần (in thẻ) ─────────────

  private async voucherOf(auth: AuthContext, storeId: string, voucherId: string) {
    await this.stores.ensureAccess(auth, storeId);
    const v = await this.prisma.storeVoucher.findFirst({ where: { id: voucherId, storeId } });
    if (!v) throw new NotFoundException("Không tìm thấy voucher");
    return v;
  }

  /** Mã chung của chương trình không được trùng mã thẻ và ngược lại */
  private async ensureCodeFree(storeId: string, code: string) {
    const hit = await this.prisma.storeVoucherCode.findUnique({ where: { storeId_code: { storeId, code } }, select: { id: true } });
    if (hit) throw new ConflictException(`Mã "${code}" đã là mã thẻ của một voucher khác`);
  }

  async listCodes(auth: AuthContext, storeId: string, voucherId: string) {
    await this.voucherOf(auth, storeId, voucherId);
    const list = await this.prisma.storeVoucherCode.findMany({
      where: { voucherId },
      orderBy: [{ createdAt: "asc" }, { code: "asc" }],
      take: 20000,
    });
    return list.map((c) => ({
      id: c.id,
      code: c.code,
      usedAt: c.usedAt?.toISOString() ?? null,
      orderCode: c.orderCode,
      createdAt: c.createdAt.toISOString(),
    }));
  }

  /**
   * Sinh hàng loạt mã ngẫu nhiên không trùng (tối đa 5.000 / lần, 20.000 / voucher).
   * Số lượt của voucher được nâng lên nếu nhỏ hơn tổng số mã.
   */
  async generateCodes(auth: AuthContext, storeId: string, voucherId: string, body: { count?: number; prefix?: string; length?: number }) {
    const v = await this.voucherOf(auth, storeId, voucherId);
    const count = Math.round(Number(body.count));
    if (!Number.isFinite(count) || count < 1 || count > 5000) throw new BadRequestException("Số lượng mã từ 1 đến 5.000 mỗi lần");
    const length = Math.min(16, Math.max(4, Math.round(Number(body.length) || 8)));
    const prefix = String(body.prefix ?? "").toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 12);
    const existing = await this.prisma.storeVoucherCode.count({ where: { voucherId } });
    if (existing + count > 20000) throw new BadRequestException("Mỗi voucher tối đa 20.000 mã");
    if (length < 6 && count > 1000) throw new BadRequestException("Sinh nhiều mã cần độ dài từ 6 ký tự trở lên");

    const taken = new Set(
      (await this.prisma.storeVoucherCode.findMany({ where: { storeId, code: { startsWith: prefix } }, select: { code: true } })).map((c) => c.code),
    );
    for (const x of await this.prisma.storeVoucher.findMany({ where: { storeId }, select: { code: true } })) taken.add(x.code);
    const fresh: string[] = [];
    let guard = 0;
    while (fresh.length < count) {
      if (++guard > count * 50) throw new BadRequestException("Không đủ tổ hợp mã — hãy tăng độ dài mã");
      const c = randomVoucherCode(prefix, length);
      if (taken.has(c)) continue;
      taken.add(c);
      fresh.push(c);
    }
    await this.prisma.$transaction(async (tx) => {
      for (let i = 0; i < fresh.length; i += 1000) {
        await tx.storeVoucherCode.createMany({ data: fresh.slice(i, i + 1000).map((code) => ({ storeId, voucherId, code })) });
      }
      const total = existing + count;
      if (v.quantity < total) await tx.storeVoucher.update({ where: { id: v.id }, data: { quantity: total } });
    });
    return { created: count, total: existing + count, quantity: Math.max(v.quantity, existing + count) };
  }

  /** Xoá mã chưa dùng (tất cả hoặc theo danh sách id). Mã đã dùng giữ lại làm lịch sử. */
  async deleteCodes(auth: AuthContext, storeId: string, voucherId: string, ids?: string[]) {
    await this.voucherOf(auth, storeId, voucherId);
    const r = await this.prisma.storeVoucherCode.deleteMany({
      where: { voucherId, usedAt: null, ...(ids?.length ? { id: { in: ids } } : {}) },
    });
    return { deleted: r.count };
  }

  /** Số mã thẻ đã sinh / đã dùng của từng voucher */
  async codeStats(storeId: string) {
    const [all, used] = await Promise.all([
      this.prisma.storeVoucherCode.groupBy({ by: ["voucherId"], where: { storeId }, _count: { _all: true } }),
      this.prisma.storeVoucherCode.groupBy({ by: ["voucherId"], where: { storeId, usedAt: { not: null } }, _count: { _all: true } }),
    ]);
    const map = new Map<string, { codeCount: number; codeUsed: number }>();
    for (const r of all) map.set(r.voucherId, { codeCount: r._count._all, codeUsed: 0 });
    for (const r of used) map.get(r.voucherId)!.codeUsed = r._count._all;
    return map;
  }

  /**
   * Chủ shop tạo đơn tại quầy / qua điện thoại. Dòng có productId lấy tên & giá từ DB
   * (cho phép sửa đơn giá), dòng tự nhập cần tên + giá. Có thể áp mã voucher, phí ship, giảm thêm.
   * Khách tìm theo customerId hoặc SĐT; chưa có thì tạo mới (saveCustomer).
   */
  /** Bán tại quầy (trang Bán hàng): tạo đơn nguồn "pos", đã hoàn thành → cộng điểm khách. Gọi sau khi đã kiểm tra quyền. */
  createPosOrder(storeId: string, body: AdminOrderInput) {
    return this.createOrder(storeId, { ...body, status: "completed" }, "pos");
  }

  private async createOrder(storeId: string, body: AdminOrderInput, source: "admin" | "pos" = "admin") {
    if (!body || typeof body !== "object") throw new BadRequestException("Dữ liệu không hợp lệ");
    const head = pickFields(body, { ...SPECS.orders, customerName: "string", phone: "string" }, ["customerName"]);
    const rawItems = Array.isArray(body.items) ? body.items : [];
    if (!rawItems.length || rawItems.length > 100) throw new BadRequestException("Đơn cần ít nhất 1 sản phẩm");

    const productIds = rawItems.map((i) => i?.productId).filter((x): x is string => typeof x === "string" && !!x);
    // Sản phẩm + nguyên liệu (BOM) để chốt giá vốn tại thời điểm bán
    const byId = await loadWithIngredients(this.prisma, storeId, [...new Set(productIds)]);
    const lines = rawItems.map((i) => {
      const quantity = Math.min(9999, Math.max(1, Math.round(Number(i?.quantity) || 1)));
      const p = i?.productId ? (byId.get(i.productId) as Prisma.StoreProductGetPayload<object> | undefined) : undefined;
      if (i?.productId && !p) throw new BadRequestException("Có sản phẩm không thuộc cửa hàng");
      const baseName = (p?.name ?? String(i?.productName ?? "")).trim().slice(0, 200);
      if (!baseName) throw new BadRequestException("Dòng sản phẩm thiếu tên");
      // Tuỳ chọn (size, topping…): giá cộng thêm theo cấu hình sản phẩm; dòng đã có tuỳ chọn chốt sẵn (POS) giữ nguyên
      const opt = p && i?.options ? applyOptions(baseName, readOptions(p.options), i.options) : null;
      const priceIn = i?.unitPrice === undefined || i?.unitPrice === null ? undefined : Number(i.unitPrice);
      const unitPrice = Math.round(priceIn ?? (p ? (p.salePrice ?? p.price) + (opt?.extra ?? 0) : NaN));
      const name = (opt?.label ?? baseName).slice(0, 200);
      if (!Number.isFinite(unitPrice) || unitPrice < 0) throw new BadRequestException(`Đơn giá của "${name}" không hợp lệ`);
      const optCost = (opt?.picked ?? []).reduce(
        (s, o) => s + (o.bom ?? []).reduce((x, l) => x + (byId.get(l.productId)?.costPrice ?? 0) * l.quantity, 0),
        0,
      );
      return {
        productId: p?.id ?? null,
        productName: name,
        imageUrl: p?.imageUrl ?? null,
        unitPrice,
        quantity,
        lineTotal: unitPrice * quantity,
        unitCost: p ? unitCostOf(p, byId) + optCost : null,
        options: opt?.picked.length ? (opt.picked as unknown as Prisma.InputJsonValue) : (i?.pickedOptions ?? undefined),
      };
    });
    const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
    const shippingFee = Math.max(0, Math.round(Number(body.shippingFee) || 0));
    const extraDiscount = Math.max(0, Math.round(Number(body.extraDiscount) || 0));

    const phone = head.phone ? (normalizeVnPhone(String(head.phone)) ?? String(head.phone)) : "";
    return this.prisma.$transaction(async (tx) => {
      let customer = body.customerId
        ? await tx.storeCustomer.findFirst({ where: { id: String(body.customerId), storeId } })
        : phone
          ? await tx.storeCustomer.findFirst({ where: { storeId, phone } })
          : null;
      if (body.customerId && !customer) throw new BadRequestException("Không tìm thấy khách hàng");
      let customerCreated = false;
      if (!customer && phone && body.saveCustomer !== false) {
        customer = await tx.storeCustomer.create({
          data: { storeId, name: String(head.customerName), phone, address: (head.address as string) || null },
        });
        customerCreated = true;
      }

      const quote = body.voucherCode?.trim()
        ? await quoteVoucher(tx, storeId, body.voucherCode, { subtotal, shippingFee, tierName: customer?.tier })
        : null;
      const discountAmount = Math.min(subtotal + shippingFee, (quote?.discount ?? 0) + extraDiscount);
      const status = (head.status as string) ?? "confirmed";

      const order = await tx.storeOrder.create({
        data: {
          storeId,
          customerId: customer?.id ?? null,
          code: makeCode("DH"),
          customerName: String(head.customerName),
          phone: phone || customer?.phone || "",
          address: (head.address as string) || customer?.address || null,
          subtotal,
          shippingFee,
          discountAmount,
          voucherCode: quote?.code ?? null,
          totalAmount: subtotal + shippingFee - discountAmount,
          source,
          status: "pending",
          paymentMethod: (head.paymentMethod as string) ?? "cash",
          note: (head.note as string) || null,
          items: { create: lines },
        },
        include: { items: true },
      });
      if (quote) await markVoucherUsed(tx, quote, order);
      const final = status === "pending" ? order : await this.applyStatus(tx, storeId, order, status);
      const savedCustomer = customer ? await tx.storeCustomer.findUnique({ where: { id: customer.id } }) : null;
      return { ...serializeOrder(final), customer: savedCustomer, customerCreated };
    });
  }

  /** Xem trước mã voucher cho màn hình tạo đơn (không ghi gì). */
  async previewVoucher(auth: AuthContext, storeId: string, body: { code?: string; subtotal?: number; shippingFee?: number; customerId?: string }) {
    await this.stores.ensureAccess(auth, storeId);
    const customer = body.customerId
      ? await this.prisma.storeCustomer.findFirst({ where: { id: body.customerId, storeId }, select: { tier: true } })
      : null;
    const q = await this.prisma.$transaction((tx) =>
      quoteVoucher(tx, storeId, String(body.code ?? ""), {
        subtotal: Math.max(0, Number(body.subtotal) || 0),
        shippingFee: Math.max(0, Number(body.shippingFee) || 0),
        tierName: customer?.tier,
      }),
    );
    return { voucherId: q.voucherId, code: q.code, title: q.title, discount: q.discount, singleUse: !!q.codeId };
  }

  /**
   * Đổi trạng thái đơn. Khi đơn chuyển sang "completed" thì cộng chi tiêu, số đơn và điểm cho khách
   * (1 điểm / 1.000đ × hệ số hạng) rồi xét lại hạng; rời "completed" thì trừ lại.
   */
  private async updateOrder(storeId: string, id: string, data: Record<string, unknown>) {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.storeOrder.findFirst({ where: { id, storeId }, include: { items: true } });
      if (!before) throw new NotFoundException("Không tìm thấy đơn hàng");
      const { status, ...rest } = data;
      const order = Object.keys(rest).length
        ? await tx.storeOrder.update({ where: { id }, data: rest, include: { items: true } })
        : before;
      return serializeOrder(status ? await this.applyStatus(tx, storeId, order, String(status)) : order);
    });
  }

  /** Đổi trạng thái + cộng/trừ điểm khách + trả / giữ lượt voucher khi huỷ / mở lại đơn. */
  private async applyStatus(
    tx: Prisma.TransactionClient,
    storeId: string,
    before: Prisma.StoreOrderGetPayload<{ include: { items: true } }>,
    status: string,
  ) {
    if (before.status === status) return before;
    const order = await tx.storeOrder.update({ where: { id: before.id }, data: { status }, include: { items: true } });
    if (status === "cancelled") await releaseVoucher(tx, storeId, order);
    else if (before.status === "cancelled") await reclaimVoucher(tx, storeId, order);
    const wasDone = before.status === "completed";
    const isDone = order.status === "completed";
    // Hoàn thành → xuất kho (nguyên liệu theo BOM); rời hoàn thành → trả lại kho
    if (wasDone !== isDone) await moveStockForOrder(tx, storeId, order.items, isDone ? -1 : 1);
    if (order.customerId && wasDone !== isDone) {
      const sign = isDone ? 1 : -1;
      const customer = await tx.storeCustomer.findUnique({ where: { id: order.customerId } });
      const tiers = await tx.storeMemberTier.findMany({ where: { storeId }, orderBy: { minSpent: "asc" } });
      const program = readStampProgram((await tx.store.findUnique({ where: { id: storeId }, select: { stampProgram: true } }))?.stampProgram);
      const stampDelta = stampsForOrder(program, order.items);
      if (customer) {
        const multiplier = tiers.find((t) => t.name === customer.tier)?.pointMultiplier ?? 1;
        const totalSpent = Math.max(0, customer.totalSpent + sign * order.totalAmount);
        const points = Math.max(0, customer.points + sign * Math.floor((order.totalAmount / 1000) * multiplier));
        const totalOrders = Math.max(0, customer.totalOrders + sign);
        const tier = tiers.filter((t) => totalSpent >= t.minSpent || (t.minPoints > 0 && points >= t.minPoints)).pop();
        await tx.storeCustomer.update({
          where: { id: customer.id },
          data: {
            totalSpent,
            points,
            totalOrders,
            ...(stampDelta ? { stamps: Math.max(0, customer.stamps + sign * stampDelta) } : {}),
            ...(tier ? { tier: tier.name } : {}),
          },
        });
      }
    }
    return order;
  }

  private async mustUpdate(p: Promise<{ count: number }>) {
    if (!(await p).count) throw new NotFoundException("Không tìm thấy dữ liệu");
  }

  private mapError(e: unknown) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return new ConflictException("Mã / đường dẫn này đã tồn tại trong store");
    }
    return e;
  }
}

export type AdminOrderInput = {
  customerId?: string;
  customerName?: string;
  phone?: string;
  address?: string;
  note?: string;
  status?: string;
  paymentMethod?: string;
  saveCustomer?: boolean;
  voucherCode?: string;
  shippingFee?: number;
  extraDiscount?: number;
  items?: {
    productId?: string | null;
    productName?: string;
    unitPrice?: number | null;
    quantity?: number;
    /** Lựa chọn của khách: [{ groupId, choiceIds }] */
    options?: OptionSelection[];
    /** Tuỳ chọn đã chốt sẵn (bán tại bàn) — lưu nguyên vào dòng đơn */
    pickedOptions?: Prisma.InputJsonValue;
  }[];
};
