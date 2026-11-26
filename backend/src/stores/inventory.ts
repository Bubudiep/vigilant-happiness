import { BadRequestException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { readCombo } from "./combo";

/** 1 dòng định mức: dùng `quantity` đơn vị (theo đơn vị của nguyên liệu, VD 20 g) cho 1 đơn vị thành phẩm */
export type BomLine = { productId: string; quantity: number };

type Tx = Prisma.TransactionClient;
type ProductLite = { id: string; kind: string; stock: number; costPrice: number; bom: unknown; options?: unknown; combo?: unknown };

export const readBom = (raw: unknown): BomLine[] =>
  Array.isArray(raw)
    ? raw
        .map((l) => ({ productId: String((l as BomLine)?.productId ?? ""), quantity: Math.round(Number((l as BomLine)?.quantity)) }))
        .filter((l) => l.productId && l.quantity > 0)
    : [];

/** Kiểm tra BOM gửi lên: nguyên liệu thuộc store, không phải chính nó, không lồng BOM, số lượng nguyên dương */
export async function parseBom(tx: Tx, storeId: string, productId: string | null, raw: unknown): Promise<BomLine[] | null> {
  if (raw === null || raw === undefined) return null;
  if (!Array.isArray(raw) || raw.length > 50) throw new BadRequestException("Định mức nguyên liệu không hợp lệ");
  const lines = raw.map((l) => {
    const q = Number((l as BomLine)?.quantity);
    if (!Number.isInteger(q) || q <= 0 || q > 1_000_000) throw new BadRequestException("Số lượng nguyên liệu phải là số nguyên dương (dùng đơn vị nhỏ: g, ml, cái…)");
    return { productId: String((l as BomLine)?.productId ?? ""), quantity: q };
  });
  if (!lines.length) return [];
  const ids = [...new Set(lines.map((l) => l.productId))];
  if (ids.length !== lines.length) throw new BadRequestException("Một nguyên liệu bị lặp trong định mức");
  if (productId && ids.includes(productId)) throw new BadRequestException("Sản phẩm không thể là nguyên liệu của chính nó");
  const found = await tx.storeProduct.findMany({ where: { storeId, id: { in: ids } }, select: { id: true, kind: true, bom: true, name: true } });
  if (found.length !== ids.length) throw new BadRequestException("Có nguyên liệu không thuộc cửa hàng");
  const bad = found.find((f) => f.kind === "service" || readBom(f.bom).length);
  if (bad) throw new BadRequestException(`“${bad.name}” không dùng làm nguyên liệu được (là dịch vụ hoặc đã có định mức riêng)`);
  return lines;
}

/** Nguyên liệu thêm của các lựa chọn đã chọn (size L thêm sữa…) — dùng cho món trong combo */
function selectionBom(rawOptions: unknown, selections: { groupId: string; choiceIds: string[] }[] | undefined): BomLine[] {
  if (!selections?.length || !Array.isArray(rawOptions)) return [];
  const groups = rawOptions as { id?: string; choices?: { id?: string; bom?: unknown }[] }[];
  return selections.flatMap((s) => {
    const g = groups.find((x) => x?.id === s.groupId);
    return (s.choiceIds ?? []).flatMap((cid) => readBom(g?.choices?.find((c) => c?.id === cid)?.bom));
  });
}

/** Giá vốn 1 đơn vị: combo → tổng giá vốn các món; có BOM → tổng giá vốn nguyên liệu; không → costPrice */
export function unitCostOf(p: ProductLite, byId: Map<string, ProductLite>): number {
  const combo = readCombo(p.combo);
  if (combo)
    return Math.round(
      combo.items.reduce((s, l) => {
        const it = byId.get(l.productId);
        if (!it) return s;
        const extra = selectionBom(it.options, l.selections).reduce((x, b) => x + (byId.get(b.productId)?.costPrice ?? 0) * b.quantity, 0);
        return s + (unitCostOf(it, byId) + extra) * l.quantity;
      }, 0),
    );
  const bom = readBom(p.bom);
  if (!bom.length) return p.costPrice;
  return Math.round(bom.reduce((sum, l) => sum + (byId.get(l.productId)?.costPrice ?? 0) * l.quantity, 0));
}

/** Số lượng có thể làm từ tồn nguyên liệu (BOM) / từ tồn các món trong combo */
export function makeableOf(p: ProductLite, byId: Map<string, ProductLite>): number | null {
  const combo = readCombo(p.combo);
  if (combo) {
    const caps = combo.items.flatMap((l) => {
      const it = byId.get(l.productId);
      if (!it) return [0];
      const each = makeableOf(it, byId) ?? (it.kind === "service" ? null : Math.max(0, it.stock));
      return each === null ? [] : [Math.floor(each / l.quantity)];
    });
    return caps.length ? Math.min(...caps) : null;
  }
  const bom = readBom(p.bom);
  if (!bom.length) return null;
  return Math.max(0, Math.min(...bom.map((l) => Math.floor(Math.max(0, byId.get(l.productId)?.stock ?? 0) / l.quantity))));
}

/** Nạp sản phẩm + món trong combo + nguyên liệu của chúng (BOM món & BOM lựa chọn) */
export async function loadWithIngredients(tx: Tx, storeId: string, ids: string[]) {
  const products = ids.length ? await tx.storeProduct.findMany({ where: { storeId, id: { in: ids } } }) : [];
  // Món nằm trong combo
  const comboIds = [...new Set(products.flatMap((p) => readCombo(p.combo)?.items.map((l) => l.productId) ?? []))].filter((id) => !ids.includes(id));
  const comboItems = comboIds.length ? await tx.storeProduct.findMany({ where: { storeId, id: { in: comboIds } } }) : [];
  const all = [...products, ...comboItems];
  const have = new Set(all.map((p) => p.id));
  // Nguyên liệu của BOM món + của các lựa chọn (size L thêm sữa, topping…)
  const optionIngredients = (raw: unknown) =>
    (Array.isArray(raw) ? (raw as { choices?: { bom?: unknown }[] }[]) : []).flatMap((g) => (g?.choices ?? []).flatMap((c) => readBom(c?.bom).map((l) => l.productId)));
  const ing = [...new Set(all.flatMap((p) => [...readBom(p.bom).map((l) => l.productId), ...optionIngredients(p.options)]))].filter((id) => !have.has(id));
  const more = ing.length ? await tx.storeProduct.findMany({ where: { storeId, id: { in: ing } } }) : [];
  return new Map([...all, ...more].map((p) => [p.id, p as ProductLite]));
}

/**
 * Xuất / nhập lại kho theo đơn: sign = -1 khi đơn hoàn thành (trừ kho), +1 khi rời trạng thái hoàn thành (trả kho).
 * Sản phẩm có BOM → trừ nguyên liệu; hàng hoá / nguyên liệu không BOM → trừ chính nó; dịch vụ không BOM → không đổi.
 */
export async function moveStockForOrder(
  tx: Tx,
  storeId: string,
  items: { productId: string | null; quantity: number; options?: unknown }[],
  sign: 1 | -1,
) {
  const ids = [...new Set(items.map((i) => i.productId).filter((x): x is string => !!x))];
  if (!ids.length) return;
  const byId = await loadWithIngredients(tx, storeId, ids);
  // Combo → tách thành từng món bên trong (tuỳ chọn của dòng combo không áp cho món con)
  const lines: typeof items = items.flatMap((i) => {
    const combo = i.productId ? readCombo(byId.get(i.productId)?.combo) : null;
    if (!combo) return [i];
    return combo.items.map((l) => ({
      productId: l.productId,
      quantity: l.quantity * i.quantity,
      // Lựa chọn cố định của món (size L…) → trừ thêm nguyên liệu của lựa chọn
      options: selectionBom(byId.get(l.productId)?.options, l.selections).length ? [{ bom: selectionBom(byId.get(l.productId)?.options, l.selections) }] : undefined,
    }));
  });
  const delta = new Map<string, number>();
  for (const i of lines) {
    const p = i.productId ? byId.get(i.productId) : undefined;
    if (!p) continue;
    const bom = readBom(p.bom);
    if (bom.length) for (const l of bom) delta.set(l.productId, (delta.get(l.productId) ?? 0) + l.quantity * i.quantity);
    else if (p.kind !== "service") delta.set(p.id, (delta.get(p.id) ?? 0) + i.quantity);
    // Nguyên liệu thêm của tuỳ chọn (size L thêm sữa, topping trân châu…)
    for (const o of Array.isArray(i.options) ? (i.options as { bom?: unknown }[]) : []) {
      for (const l of readBom(o?.bom)) delta.set(l.productId, (delta.get(l.productId) ?? 0) + l.quantity * i.quantity);
    }
  }
  for (const [id, q] of delta) {
    await tx.storeProduct.updateMany({ where: { id, storeId }, data: { stock: { increment: sign * q } } });
  }
}
