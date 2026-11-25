import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma, StoreStockReceipt } from "@prisma/client";
import type { AuthContext } from "../common/guards/app-auth.guard";
import { PrismaService } from "../prisma/prisma.service";
import { loadWithIngredients, makeableOf, readBom, unitCostOf } from "../stores/inventory";
import { StoresService } from "../stores/stores.service";

type ReceiptItem = { productId: string; name: string; quantity: number; unitCost: number };

/**
 * Nhập kho: phiếu nhập cộng tồn kho và tính lại giá vốn bình quân gia quyền
 *   giá vốn mới = (tồn cũ × giá vốn cũ + SL nhập × giá nhập) / (tồn cũ + SL nhập)
 * Huỷ phiếu: trừ lại tồn kho (giá vốn giữ nguyên).
 */
@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stores: StoresService,
  ) {}

  /** Tổng quan kho: giá trị tồn (giá vốn), giá vốn từng món (kể cả món có BOM), số lượng làm được */
  async summary(auth: AuthContext, storeId: string) {
    await this.stores.ensureAccess(auth, storeId);
    const products = await this.prisma.storeProduct.findMany({ where: { storeId } });
    const byId = new Map(products.map((p) => [p.id, p]));
    let stockValue = 0;
    let saleValue = 0;
    const items = products.map((p) => {
      const bom = readBom(p.bom);
      const cost = unitCostOf(p, byId);
      // Chỉ hàng có tồn thật (không BOM, không dịch vụ) tính vào giá trị tồn kho
      if (!bom.length && p.kind !== "service") {
        stockValue += Math.max(0, p.stock) * p.costPrice;
        if (p.kind === "product") saleValue += Math.max(0, p.stock) * (p.salePrice ?? p.price);
      }
      return { id: p.id, unitCost: cost, makeable: makeableOf(p, byId) };
    });
    return { stockValue, saleValue, items };
  }

  async list(auth: AuthContext, storeId: string) {
    await this.stores.ensureAccess(auth, storeId);
    const list = await this.prisma.storeStockReceipt.findMany({ where: { storeId }, orderBy: { receivedAt: "desc" }, take: 200 });
    return list.map(this.serialize);
  }

  async create(auth: AuthContext, storeId: string, body: { supplier?: string; note?: string; receivedAt?: string; items?: unknown }) {
    await this.stores.ensureAccess(auth, storeId);
    const raw = Array.isArray(body?.items) ? body.items : [];
    if (!raw.length || raw.length > 200) throw new BadRequestException("Phiếu nhập cần 1–200 dòng");
    const lines = raw.map((r) => {
      const i = (r ?? {}) as Partial<ReceiptItem>;
      const quantity = Math.round(Number(i.quantity));
      const unitCost = Math.round(Number(i.unitCost));
      if (!i.productId) throw new BadRequestException("Dòng nhập thiếu sản phẩm");
      if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 10_000_000) throw new BadRequestException("Số lượng nhập phải là số nguyên dương");
      if (!Number.isFinite(unitCost) || unitCost < 0) throw new BadRequestException("Giá nhập không hợp lệ");
      return { productId: String(i.productId), quantity, unitCost };
    });
    const receivedAt = body?.receivedAt ? new Date(String(body.receivedAt)) : new Date();
    if (Number.isNaN(receivedAt.getTime())) throw new BadRequestException("Ngày nhập không hợp lệ");

    return this.prisma.$transaction(async (tx) => {
      const ids = [...new Set(lines.map((l) => l.productId))];
      const products = await tx.storeProduct.findMany({ where: { storeId, id: { in: ids } } });
      if (products.length !== ids.length) throw new BadRequestException("Có sản phẩm không thuộc cửa hàng");
      const bad = products.find((p) => p.kind === "service" || readBom(p.bom).length);
      if (bad) throw new BadRequestException(`“${bad.name}” không nhập kho được (dịch vụ hoặc món làm từ nguyên liệu — hãy nhập nguyên liệu)`);

      // Gộp dòng trùng sản phẩm, cập nhật tồn & giá vốn bình quân
      const merged = new Map<string, { quantity: number; amount: number }>();
      for (const l of lines) {
        const m = merged.get(l.productId) ?? { quantity: 0, amount: 0 };
        m.quantity += l.quantity;
        m.amount += l.quantity * l.unitCost;
        merged.set(l.productId, m);
      }
      for (const p of products) {
        const m = merged.get(p.id)!;
        const oldQty = Math.max(0, p.stock);
        const costPrice = Math.round((oldQty * p.costPrice + m.amount) / (oldQty + m.quantity));
        await tx.storeProduct.update({ where: { id: p.id }, data: { stock: { increment: m.quantity }, costPrice } });
      }
      const items: ReceiptItem[] = lines.map((l) => ({ ...l, name: products.find((p) => p.id === l.productId)!.name }));
      const count = await tx.storeStockReceipt.count({ where: { storeId } });
      const r = await tx.storeStockReceipt.create({
        data: {
          storeId,
          code: `PN${String(count + 1).padStart(5, "0")}`,
          supplier: body?.supplier?.trim().slice(0, 120) || null,
          note: body?.note?.trim().slice(0, 500) || null,
          receivedAt,
          items: items as unknown as Prisma.InputJsonValue,
          total: items.reduce((s, i) => s + i.quantity * i.unitCost, 0),
          createdBy: auth.userId ?? null,
        },
      });
      const after = await tx.storeProduct.findMany({ where: { storeId, id: { in: ids } }, select: { id: true, stock: true, costPrice: true } });
      return { receipt: this.serialize(r), products: after };
    });
  }

  async cancel(auth: AuthContext, storeId: string, id: string) {
    await this.stores.ensureAccess(auth, storeId);
    return this.prisma.$transaction(async (tx) => {
      const r = await tx.storeStockReceipt.findFirst({ where: { id, storeId } });
      if (!r) throw new NotFoundException("Không tìm thấy phiếu nhập");
      if (r.status === "cancelled") throw new ConflictException("Phiếu đã huỷ");
      const items = r.items as unknown as ReceiptItem[];
      for (const i of items) await tx.storeProduct.updateMany({ where: { id: i.productId, storeId }, data: { stock: { decrement: i.quantity } } });
      const saved = await tx.storeStockReceipt.update({ where: { id }, data: { status: "cancelled", cancelledAt: new Date() } });
      const after = await tx.storeProduct.findMany({ where: { storeId, id: { in: items.map((i) => i.productId) } }, select: { id: true, stock: true, costPrice: true } });
      return { receipt: this.serialize(saved), products: after };
    });
  }

  /** Giá vốn hiện tại (kể cả BOM) theo id — dùng cho báo cáo khi đơn cũ chưa chốt giá vốn */
  async currentCosts(storeId: string, ids: string[]) {
    const byId = await loadWithIngredients(this.prisma, storeId, ids);
    return new Map(ids.filter((id) => byId.has(id)).map((id) => [id, unitCostOf(byId.get(id)!, byId)]));
  }

  private serialize = (r: StoreStockReceipt) => ({
    id: r.id,
    code: r.code,
    supplier: r.supplier,
    note: r.note,
    receivedAt: r.receivedAt.toISOString(),
    items: r.items as unknown as ReceiptItem[],
    total: r.total,
    status: r.status,
    cancelledAt: r.cancelledAt?.toISOString() ?? null,
  });
}
