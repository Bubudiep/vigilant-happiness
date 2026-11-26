import { BadRequestException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { applyOptions, readOptions, type OptionSelection } from "./options";

/**
 * Combo = 1 sản phẩm gồm nhiều món đang bán (VD cà phê + bánh) kèm giảm giá.
 * Giá combo = tổng giá các món × số lượng − giảm (số tiền hoặc %), tính lại mỗi lần lưu combo.
 * Bán combo → trừ kho / tính giá vốn theo từng món bên trong (xem inventory.ts).
 */
/** selections: size / topping cố định của món trong combo (VD cà phê size L) */
export type ComboLine = { productId: string; quantity: number; selections?: OptionSelection[] };
export interface ComboConfig {
  items: ComboLine[];
  discountType: "amount" | "percent";
  discountValue: number;
}

type Tx = Prisma.TransactionClient;

export function readCombo(raw: unknown): ComboConfig | null {
  const c = raw as Partial<ComboConfig> | null;
  if (!c || !Array.isArray(c.items) || !c.items.length) return null;
  const items = c.items
    .map((l) => ({
      productId: String(l?.productId ?? ""),
      quantity: Math.round(Number(l?.quantity)),
      ...(Array.isArray(l?.selections) && l.selections.length ? { selections: l.selections } : {}),
    }))
    .filter((l) => l.productId && l.quantity > 0);
  if (!items.length) return null;
  return { items, discountType: c.discountType === "percent" ? "percent" : "amount", discountValue: Math.max(0, Number(c.discountValue) || 0) };
}

/** Giá combo từ giá gốc các món */
export function comboPrice(base: number, c: Pick<ComboConfig, "discountType" | "discountValue">) {
  if (c.discountType === "percent") return Math.max(0, Math.round((base * (100 - Math.min(100, c.discountValue))) / 100 / 1000) * 1000);
  return Math.max(0, base - Math.round(c.discountValue));
}

/**
 * Kiểm tra combo chủ shop gửi lên: 2–20 món của store, không phải nguyên liệu / combo khác / chính nó.
 * Trả cấu hình + giá gốc + giá combo; null = bỏ combo.
 */
export async function parseCombo(tx: Tx, storeId: string, productId: string | null, raw: unknown) {
  if (raw === null || raw === undefined) return null;
  const c = raw as Partial<ComboConfig>;
  if (!Array.isArray(c.items) || c.items.length < 2 || c.items.length > 20) throw new BadRequestException("Combo cần 2–20 món");
  const items = c.items.map((l) => {
    const q = Number(l?.quantity);
    if (!Number.isInteger(q) || q < 1 || q > 99) throw new BadRequestException("Số lượng món trong combo phải từ 1 đến 99");
    return { productId: String(l?.productId ?? ""), quantity: q, selections: Array.isArray(l?.selections) ? l.selections : undefined };
  });
  const ids = [...new Set(items.map((l) => l.productId))];
  if (ids.length !== items.length) throw new BadRequestException("Một món bị lặp trong combo — tăng số lượng thay vì thêm 2 lần");
  if (productId && ids.includes(productId)) throw new BadRequestException("Combo không thể chứa chính nó");
  const found = await tx.storeProduct.findMany({ where: { storeId, id: { in: ids } }, select: { id: true, name: true, kind: true, price: true, salePrice: true, combo: true, options: true } });
  if (found.length !== ids.length) throw new BadRequestException("Có món không thuộc cửa hàng");
  const bad = found.find((p) => p.kind === "material" || readCombo(p.combo));
  if (bad) throw new BadRequestException(`“${bad.name}” không thêm vào combo được (là nguyên liệu hoặc combo khác)`);
  const discountType = c.discountType === "percent" ? "percent" : "amount";
  const discountValue = Math.round(Number(c.discountValue) || 0);
  if (discountValue < 0 || (discountType === "percent" && discountValue > 100)) throw new BadRequestException("Mức giảm không hợp lệ");
  const byId = new Map(found.map((p) => [p.id, p]));
  // Tuỳ chọn của từng món: kiểm tra theo cấu hình món, cộng giá thêm vào giá gốc combo, lưu lại dạng chuẩn
  let base = 0;
  const lines: ComboLine[] = items.map((l) => {
    const p = byId.get(l.productId)!;
    const opt = applyOptions(p.name, readOptions(p.options), l.selections);
    base += ((p.salePrice ?? p.price) + opt.extra) * l.quantity;
    const sel = new Map<string, string[]>();
    for (const o of opt.picked) sel.set(o.groupId, [...(sel.get(o.groupId) ?? []), o.choiceId]);
    return { productId: l.productId, quantity: l.quantity, ...(sel.size ? { selections: [...sel].map(([groupId, choiceIds]) => ({ groupId, choiceIds })) } : {}) };
  });
  if (discountType === "amount" && discountValue > base) throw new BadRequestException("Số tiền giảm lớn hơn tổng giá các món");
  const combo: ComboConfig = { items: lines, discountType, discountValue };
  return { combo, base, price: comboPrice(base, combo) };
}
