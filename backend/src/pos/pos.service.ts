import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma, StoreArea, StoreTable, StoreTableSession } from "@prisma/client";
import type { AuthContext } from "../common/guards/app-auth.guard";
import { PrismaService } from "../prisma/prisma.service";
import { pickFields, PAYMENT_METHODS, type FieldSpec } from "../stores/store-data";
import { StoreDataService } from "../stores/store-data.service";
import { StoresService } from "../stores/stores.service";
import { applyOptions, readOptions, type OptionSelection, type PickedOption } from "../stores/options";

export const TABLE_KINDS = ["table", "billiards", "karaoke", "room", "other"] as const;
export const TABLE_STATES = ["ready", "reserved", "cleaning"] as const;

const AREA_SPEC: FieldSpec = { name: "string", sortOrder: "int" };
const TABLE_SPEC: FieldSpec = {
  areaId: "string",
  name: "string",
  kind: { oneOf: TABLE_KINDS },
  seats: "int",
  pricePerHour: "int",
  blockMinutes: "int",
  minMinutes: "int",
  state: { oneOf: TABLE_STATES },
  stateNote: "string",
  active: "bool",
  sortOrder: "int",
};

type SessionItem = {
  productId: string | null;
  name: string;
  unitPrice: number;
  quantity: number;
  /** Tuỳ chọn đã chọn (size, topping…) — giá đã cộng vào unitPrice */
  options?: PickedOption[];
};

/**
 * Tiền giờ: số phút đã dùng làm tròn LÊN theo block (VD block 30′: 41′ → 60′), tối thiểu `minMinutes`.
 * Tiền = phút tính × giá giờ / 60 (làm tròn tới 1.000đ).
 */
export function timeCharge(startedAt: Date, endAt: Date, pricePerHour: number, blockMinutes: number, minMinutes: number) {
  const minutes = Math.max(0, Math.ceil((endAt.getTime() - startedAt.getTime()) / 60_000));
  if (!pricePerHour) return { minutes, billedMinutes: 0, charge: 0 };
  const block = Math.max(1, blockMinutes || 1);
  const billedMinutes = Math.max(minMinutes || 0, Math.ceil(minutes / block) * block);
  const charge = Math.round((billedMinutes * pricePerHour) / 60 / 1000) * 1000;
  return { minutes, billedMinutes, charge };
}

const fmtDuration = (m: number) => (m < 60 ? `${m} phút` : `${Math.floor(m / 60)}h${m % 60 ? String(m % 60).padStart(2, "0") : ""}`);

/**
 * Bán hàng tại quầy: khu vực / tầng, bàn / phòng (có thể tính giờ), phiên sử dụng bàn và thanh toán.
 * Thanh toán tạo đơn StoreOrder nguồn "pos" (đã hoàn thành) → vào báo cáo doanh thu & điểm khách.
 */
@Injectable()
export class PosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stores: StoresService,
    private readonly storeData: StoreDataService,
  ) {}

  // ───────────── đọc ─────────────

  async overview(auth: AuthContext, storeId: string) {
    await this.stores.ensureSection(auth, storeId, "pos");
    const [areas, tables, sessions] = await Promise.all([
      this.prisma.storeArea.findMany({ where: { storeId }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
      this.prisma.storeTable.findMany({ where: { storeId }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
      this.prisma.storeTableSession.findMany({ where: { storeId, status: "open" }, orderBy: { startedAt: "asc" } }),
    ]);
    const now = new Date();
    return {
      now: now.toISOString(),
      areas: areas.map(this.serializeArea),
      tables: tables.map(this.serializeTable),
      sessions: sessions.map((s) => this.serializeSession(s, now)),
    };
  }

  // ───────────── khu vực ─────────────

  async createArea(auth: AuthContext, storeId: string, body: unknown) {
    await this.stores.ensureSection(auth, storeId, "pos");
    const d = pickFields(body, AREA_SPEC, ["name"]);
    return this.serializeArea(await this.prisma.storeArea.create({ data: { ...(d as { name: string }), storeId } }));
  }

  async updateArea(auth: AuthContext, storeId: string, id: string, body: unknown) {
    await this.stores.ensureSection(auth, storeId, "pos");
    const res = await this.prisma.storeArea.updateMany({ where: { id, storeId }, data: pickFields(body, AREA_SPEC) });
    if (!res.count) throw new NotFoundException("Không tìm thấy khu vực");
    return this.serializeArea(await this.prisma.storeArea.findUniqueOrThrow({ where: { id } }));
  }

  /** Xoá khu vực: bàn trong khu chuyển về "Chưa xếp khu" */
  async removeArea(auth: AuthContext, storeId: string, id: string) {
    await this.stores.ensureSection(auth, storeId, "pos");
    const res = await this.prisma.storeArea.deleteMany({ where: { id, storeId } });
    if (!res.count) throw new NotFoundException("Không tìm thấy khu vực");
    return { id, deleted: true };
  }

  // ───────────── bàn / phòng ─────────────

  async createTable(auth: AuthContext, storeId: string, body: unknown) {
    await this.stores.ensureSection(auth, storeId, "pos");
    const d = await this.tableData(storeId, body, true);
    return this.serializeTable(await this.prisma.storeTable.create({ data: { ...(d as { name: string }), storeId } }));
  }

  /** Thêm nhanh nhiều bàn: { prefix: "B", from: 1, count: 10, areaId, ...cấu hình chung } */
  async createTablesBulk(auth: AuthContext, storeId: string, body: { prefix?: string; from?: number; count?: number } & Record<string, unknown>) {
    await this.stores.ensureSection(auth, storeId, "pos");
    const count = Math.min(100, Math.max(1, Math.round(Number(body?.count) || 0)));
    const from = Math.max(0, Math.round(Number(body?.from) || 1));
    const prefix = String(body?.prefix ?? "Bàn ").slice(0, 40);
    const base = await this.tableData(storeId, { ...body, name: "x" }, true);
    const last = await this.prisma.storeTable.aggregate({ where: { storeId }, _max: { sortOrder: true } });
    const start = (last._max.sortOrder ?? 0) + 1;
    await this.prisma.storeTable.createMany({
      data: Array.from({ length: count }, (_, i) => ({ ...(base as object), storeId, name: `${prefix}${from + i}`, sortOrder: start + i })) as Prisma.StoreTableCreateManyInput[],
    });
    return this.overview(auth, storeId);
  }

  async updateTable(auth: AuthContext, storeId: string, id: string, body: unknown) {
    await this.stores.ensureSection(auth, storeId, "pos");
    const d = await this.tableData(storeId, body, false);
    const res = await this.prisma.storeTable.updateMany({ where: { id, storeId }, data: d });
    if (!res.count) throw new NotFoundException("Không tìm thấy bàn");
    return this.serializeTable(await this.prisma.storeTable.findUniqueOrThrow({ where: { id } }));
  }

  async removeTable(auth: AuthContext, storeId: string, id: string) {
    await this.stores.ensureSection(auth, storeId, "pos");
    const open = await this.prisma.storeTableSession.count({ where: { storeId, tableId: id, status: "open" } });
    if (open) throw new ConflictException("Bàn đang có khách — thanh toán hoặc huỷ phiên trước khi xoá");
    const res = await this.prisma.storeTable.deleteMany({ where: { id, storeId } });
    if (!res.count) throw new NotFoundException("Không tìm thấy bàn");
    return { id, deleted: true };
  }

  // ───────────── phiên sử dụng bàn ─────────────

  async open(auth: AuthContext, storeId: string, tableId: string, body: { guestCount?: number; customerId?: string; customerName?: string; note?: string; startedAt?: string }) {
    await this.stores.ensureSection(auth, storeId, "pos");
    const table = await this.table(storeId, tableId);
    if (!table.active) throw new BadRequestException("Bàn đang ngưng sử dụng");
    const busy = await this.prisma.storeTableSession.findFirst({ where: { tableId, status: "open" }, select: { id: true } });
    if (busy) throw new ConflictException(`${table.name} đang có khách`);
    const customer = body?.customerId
      ? await this.prisma.storeCustomer.findFirst({ where: { id: String(body.customerId), storeId }, select: { id: true, name: true } })
      : null;
    // Cho phép lùi giờ bắt đầu (quên bấm mở bàn) tối đa 12 tiếng
    let startedAt = new Date();
    if (body?.startedAt) {
      const t = new Date(String(body.startedAt));
      if (Number.isNaN(t.getTime()) || t > new Date(Date.now() + 60_000) || Date.now() - t.getTime() > 12 * 3_600_000) {
        throw new BadRequestException("Giờ bắt đầu không hợp lệ");
      }
      startedAt = t;
    }
    const session = await this.prisma.$transaction(async (tx) => {
      const s = await tx.storeTableSession.create({
        data: {
          storeId,
          tableId,
          startedAt,
          guestCount: body?.guestCount ? Math.max(0, Math.round(Number(body.guestCount))) : null,
          customerId: customer?.id ?? null,
          customerName: customer?.name ?? (body?.customerName?.trim() || null),
          note: body?.note?.trim() || null,
          pricePerHour: table.pricePerHour,
          blockMinutes: table.blockMinutes,
          minMinutes: table.minMinutes,
        },
      });
      if (table.state !== "ready") await tx.storeTable.update({ where: { id: tableId }, data: { state: "ready", stateNote: null } });
      return s;
    });
    return this.serializeSession(session, new Date());
  }

  /** Sửa phiên: món, số khách, khách hàng, ghi chú, giảm giá, giờ bắt đầu */
  async updateSession(
    auth: AuthContext,
    storeId: string,
    id: string,
    body: { items?: unknown; guestCount?: number | null; customerId?: string | null; customerName?: string | null; note?: string | null; discount?: number; startedAt?: string },
  ) {
    await this.stores.ensureSection(auth, storeId, "pos");
    const s = await this.openSession(storeId, id);
    const data: Prisma.StoreTableSessionUpdateInput = {};
    if (body?.items !== undefined) data.items = (await this.items(storeId, body.items)) as unknown as Prisma.InputJsonValue;
    if (body?.guestCount !== undefined) data.guestCount = body.guestCount === null ? null : Math.max(0, Math.round(Number(body.guestCount) || 0));
    if (body?.note !== undefined) data.note = body.note?.trim() || null;
    if (body?.discount !== undefined) data.discount = Math.max(0, Math.round(Number(body.discount) || 0));
    if (body?.customerId !== undefined) {
      const c = body.customerId ? await this.prisma.storeCustomer.findFirst({ where: { id: String(body.customerId), storeId }, select: { id: true, name: true } }) : null;
      if (body.customerId && !c) throw new BadRequestException("Không tìm thấy khách hàng");
      data.customerId = c?.id ?? null;
      data.customerName = c?.name ?? null;
    }
    if (body?.customerName !== undefined && body?.customerId === undefined) data.customerName = body.customerName?.trim() || null;
    if (body?.startedAt) {
      const t = new Date(String(body.startedAt));
      if (Number.isNaN(t.getTime()) || t > new Date()) throw new BadRequestException("Giờ bắt đầu không hợp lệ");
      data.startedAt = t;
    }
    const saved = await this.prisma.storeTableSession.update({ where: { id: s.id }, data });
    return this.serializeSession(saved, new Date());
  }

  /** Chuyển khách sang bàn khác (giữ giờ bắt đầu & món; giá giờ theo bàn mới) */
  async move(auth: AuthContext, storeId: string, id: string, tableId: string) {
    await this.stores.ensureSection(auth, storeId, "pos");
    const s = await this.openSession(storeId, id);
    if (s.tableId === tableId) return this.serializeSession(s, new Date());
    const table = await this.table(storeId, tableId);
    const busy = await this.prisma.storeTableSession.findFirst({ where: { tableId, status: "open" }, select: { id: true } });
    if (busy) throw new ConflictException(`${table.name} đang có khách`);
    const saved = await this.prisma.storeTableSession.update({
      where: { id: s.id },
      data: { tableId, pricePerHour: table.pricePerHour, blockMinutes: table.blockMinutes, minMinutes: table.minMinutes },
    });
    return this.serializeSession(saved, new Date());
  }

  async cancel(auth: AuthContext, storeId: string, id: string) {
    await this.stores.ensureSection(auth, storeId, "pos");
    const s = await this.openSession(storeId, id);
    const saved = await this.prisma.storeTableSession.update({ where: { id: s.id }, data: { status: "cancelled", endedAt: new Date() } });
    return this.serializeSession(saved, new Date());
  }

  /** Thanh toán: chốt tiền giờ + món → tạo đơn "pos" đã hoàn thành; bàn chuyển "đang dọn" (tuỳ chọn) */
  async checkout(auth: AuthContext, storeId: string, id: string, body: { paymentMethod?: string; discount?: number; cleaning?: boolean }) {
    await this.stores.ensureSection(auth, storeId, "pos");
    const s = await this.openSession(storeId, id);
    const table = await this.table(storeId, s.tableId);
    const paymentMethod = (PAYMENT_METHODS as readonly string[]).includes(String(body?.paymentMethod)) ? String(body.paymentMethod) : "cash";
    const endedAt = new Date();
    const t = timeCharge(s.startedAt, endedAt, s.pricePerHour, s.blockMinutes, s.minMinutes);
    const items = (s.items as unknown as SessionItem[]) ?? [];
    const itemsTotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
    const discount = Math.min(itemsTotal + t.charge, Math.max(0, Math.round(Number(body?.discount ?? s.discount) || 0)));
    if (!items.length && !t.charge) throw new BadRequestException("Phiên chưa có món và không tính giờ — dùng “Huỷ phiên” nếu khách không dùng gì");

    const lines = [
      ...(t.charge
        ? [{ productId: null, productName: `Giờ ${table.name} (${fmtDuration(t.billedMinutes)})`, unitPrice: t.charge, quantity: 1 }]
        : []),
      ...items.map((i) => ({
        productId: i.productId,
        productName: i.name,
        unitPrice: i.unitPrice,
        quantity: i.quantity,
        pickedOptions: i.options?.length ? (i.options as unknown as Prisma.InputJsonValue) : undefined,
      })),
    ];
    const order = (await this.storeData.createPosOrder(storeId, {
      customerId: s.customerId ?? undefined,
      customerName: s.customerName || `Khách lẻ · ${table.name}`,
      paymentMethod,
      extraDiscount: discount,
      saveCustomer: false,
      note: [`${table.name} · ${fmtTime(s.startedAt)}–${fmtTime(endedAt)}`, s.note].filter(Boolean).join(" · "),
      items: lines,
    })) as { id: string; code: string; total: number };

    const saved = await this.prisma.$transaction(async (tx) => {
      const done = await tx.storeTableSession.update({
        where: { id: s.id },
        data: { status: "closed", endedAt, timeCharge: t.charge, itemsTotal, discount, total: itemsTotal + t.charge - discount, paymentMethod, orderId: order.id },
      });
      if (body?.cleaning) await tx.storeTable.update({ where: { id: table.id }, data: { state: "cleaning" } });
      return done;
    });
    return { session: this.serializeSession(saved, endedAt), order: { id: order.id, code: order.code, total: order.total } };
  }

  // ───────────── nội bộ ─────────────

  private async table(storeId: string, id: string) {
    const t = await this.prisma.storeTable.findFirst({ where: { id, storeId } });
    if (!t) throw new NotFoundException("Không tìm thấy bàn");
    return t;
  }

  private async openSession(storeId: string, id: string) {
    const s = await this.prisma.storeTableSession.findFirst({ where: { id, storeId } });
    if (!s) throw new NotFoundException("Không tìm thấy phiên");
    if (s.status !== "open") throw new ConflictException("Phiên đã đóng");
    return s;
  }

  private async tableData(storeId: string, body: unknown, creating: boolean) {
    const d = pickFields(body, TABLE_SPEC, creating ? ["name"] : []);
    if (d.areaId === "") d.areaId = null;
    if (d.areaId) {
      const a = await this.prisma.storeArea.findFirst({ where: { id: String(d.areaId), storeId }, select: { id: true } });
      if (!a) throw new BadRequestException("Khu vực không thuộc cửa hàng");
    }
    if (d.blockMinutes !== undefined && (Number(d.blockMinutes) < 1 || Number(d.blockMinutes) > 240)) throw new BadRequestException("Block tính giờ 1–240 phút");
    if (d.name === "") throw new BadRequestException("Thiếu tên bàn");
    return d;
  }

  private async items(storeId: string, raw: unknown): Promise<SessionItem[]> {
    if (!Array.isArray(raw) || raw.length > 200) throw new BadRequestException("Danh sách món không hợp lệ");
    const ids = raw.map((i) => (i as { productId?: unknown })?.productId).filter((x): x is string => typeof x === "string" && !!x);
    const products = ids.length ? await this.prisma.storeProduct.findMany({ where: { storeId, id: { in: ids } } }) : [];
    return raw.map((r) => {
      const i = (r ?? {}) as Partial<SessionItem> & { selections?: OptionSelection[] };
      const p = i.productId ? products.find((x) => x.id === i.productId) : undefined;
      if (i.productId && !p) throw new BadRequestException("Có món không thuộc cửa hàng");
      const quantity = Math.min(9999, Math.max(1, Math.round(Number(i.quantity) || 1)));
      // Món mới chọn tuỳ chọn → tính lại giá theo cấu hình; món đã có tuỳ chọn chốt sẵn → giữ nguyên
      if (p && i.selections) {
        const opt = applyOptions(p.name, readOptions(p.options), i.selections);
        return { productId: p.id, name: opt.label, unitPrice: (p.salePrice ?? p.price) + opt.extra, quantity, ...(opt.picked.length ? { options: opt.picked } : {}) };
      }
      const name = String(i.name ?? p?.name ?? "").trim().slice(0, 200);
      const unitPrice = Math.round(Number(i.unitPrice ?? p?.salePrice ?? p?.price));
      if (!name) throw new BadRequestException("Món thiếu tên");
      if (!Number.isFinite(unitPrice) || unitPrice < 0) throw new BadRequestException(`Đơn giá "${name}" không hợp lệ`);
      return { productId: p?.id ?? null, name, unitPrice, quantity, ...(Array.isArray(i.options) && i.options.length ? { options: i.options } : {}) };
    });
  }

  private serializeArea = (a: StoreArea) => ({ id: a.id, name: a.name, sortOrder: a.sortOrder });

  private serializeTable = (t: StoreTable) => ({
    id: t.id,
    areaId: t.areaId,
    name: t.name,
    kind: t.kind,
    seats: t.seats,
    pricePerHour: t.pricePerHour,
    blockMinutes: t.blockMinutes,
    minMinutes: t.minMinutes,
    state: t.state,
    stateNote: t.stateNote,
    active: t.active,
    sortOrder: t.sortOrder,
  });

  private serializeSession(s: StoreTableSession, now: Date) {
    const items = (s.items as unknown as SessionItem[]) ?? [];
    const itemsTotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
    const t = s.status === "open" ? timeCharge(s.startedAt, now, s.pricePerHour, s.blockMinutes, s.minMinutes) : null;
    const charge = t ? t.charge : s.timeCharge;
    return {
      id: s.id,
      tableId: s.tableId,
      status: s.status,
      startedAt: s.startedAt.toISOString(),
      endedAt: s.endedAt?.toISOString() ?? null,
      guestCount: s.guestCount,
      customerId: s.customerId,
      customerName: s.customerName,
      note: s.note,
      items,
      pricePerHour: s.pricePerHour,
      blockMinutes: s.blockMinutes,
      minMinutes: s.minMinutes,
      timeCharge: charge,
      itemsTotal,
      discount: s.discount,
      total: Math.max(0, itemsTotal + charge - s.discount),
      orderId: s.orderId,
      paymentMethod: s.paymentMethod,
    };
  }
}

const fmtTime = (d: Date) => new Date(d.getTime() + 7 * 3_600_000).toISOString().slice(11, 16);
