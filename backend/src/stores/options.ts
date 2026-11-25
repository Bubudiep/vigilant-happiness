import { BadRequestException } from "@nestjs/common";
import { randomBytes } from "node:crypto";
import { type BomLine, readBom } from "./inventory";

/**
 * Tuỳ chọn của sản phẩm: phân loại (Size S/M/L, màu…) và bán kèm (topping, thêm shot…).
 * - multiple = false: chọn 1 (phân loại / size); multiple = true: chọn nhiều (topping), tối đa `max`.
 * - Mỗi lựa chọn cộng thêm `price` vào giá món và có thể trừ thêm nguyên liệu (`bom`).
 */
export interface OptionChoice {
  id: string;
  name: string;
  price: number;
  bom?: BomLine[];
}
export interface OptionGroup {
  id: string;
  name: string;
  multiple: boolean;
  required: boolean;
  max?: number | null;
  choices: OptionChoice[];
}
/** Lựa chọn đã chốt trong đơn (lưu kèm dòng đơn) */
export interface PickedOption {
  groupId: string;
  group: string;
  choiceId: string;
  name: string;
  price: number;
  bom?: BomLine[];
}
export type OptionSelection = { groupId: string; choiceIds: string[] };

const rid = () => randomBytes(4).toString("hex");

export const readOptions = (raw: unknown): OptionGroup[] => (Array.isArray(raw) ? (raw as OptionGroup[]) : []);

/** Kiểm tra cấu hình tuỳ chọn chủ shop gửi lên */
export function parseOptions(raw: unknown, ingredientIds: Set<string>): OptionGroup[] | null {
  if (raw === null || raw === undefined) return null;
  if (!Array.isArray(raw) || raw.length > 20) throw new BadRequestException("Tuỳ chọn không hợp lệ (tối đa 20 nhóm)");
  return raw.map((g) => {
    const name = String(g?.name ?? "").trim().slice(0, 60);
    if (!name) throw new BadRequestException("Nhóm tuỳ chọn thiếu tên");
    if (!Array.isArray(g?.choices) || !g.choices.length || g.choices.length > 50) throw new BadRequestException(`Nhóm “${name}” cần 1–50 lựa chọn`);
    const multiple = !!g.multiple;
    const choices = g.choices.map((c: Partial<OptionChoice>) => {
      const cname = String(c?.name ?? "").trim().slice(0, 60);
      if (!cname) throw new BadRequestException(`Nhóm “${name}” có lựa chọn thiếu tên`);
      const price = Math.round(Number(c?.price ?? 0));
      if (!Number.isFinite(price) || price < -10_000_000 || price > 100_000_000) throw new BadRequestException(`Giá “${cname}” không hợp lệ`);
      const bom = readBom(c?.bom);
      const unknown = bom.find((l) => !ingredientIds.has(l.productId));
      if (unknown) throw new BadRequestException(`Nguyên liệu của “${cname}” không hợp lệ`);
      return { id: String(c?.id || rid()).slice(0, 20), name: cname, price, ...(bom.length ? { bom } : {}) };
    });
    const max = multiple && g.max ? Math.max(1, Math.min(choices.length, Math.round(Number(g.max)))) : null;
    return { id: String(g?.id || rid()).slice(0, 20), name, multiple, required: !!g.required, max, choices };
  });
}

/**
 * Áp lựa chọn của khách vào 1 món: trả giá cộng thêm, nhãn hiển thị và danh sách đã chọn.
 * Nhóm bắt buộc mà không chọn → chọn lựa chọn đầu tiên (VD size mặc định) nếu chọn 1, còn lại báo lỗi.
 */
export function applyOptions(productName: string, groups: OptionGroup[], selections: OptionSelection[] | undefined) {
  const picked: PickedOption[] = [];
  const sel = new Map((selections ?? []).map((s) => [String(s?.groupId), (Array.isArray(s?.choiceIds) ? s.choiceIds : []).map(String)]));
  for (const id of sel.keys()) if (!groups.some((g) => g.id === id)) throw new BadRequestException(`“${productName}”: nhóm tuỳ chọn không tồn tại`);
  for (const g of groups) {
    let ids = [...new Set(sel.get(g.id) ?? [])];
    if (!ids.length && g.required) {
      if (g.multiple) throw new BadRequestException(`“${productName}”: chưa chọn ${g.name}`);
      ids = [g.choices[0].id];
    }
    if (!g.multiple && ids.length > 1) throw new BadRequestException(`“${productName}”: ${g.name} chỉ được chọn 1`);
    if (g.max && ids.length > g.max) throw new BadRequestException(`“${productName}”: ${g.name} tối đa ${g.max}`);
    for (const cid of ids) {
      const c = g.choices.find((x) => x.id === cid);
      if (!c) throw new BadRequestException(`“${productName}”: lựa chọn không tồn tại trong ${g.name}`);
      picked.push({ groupId: g.id, group: g.name, choiceId: c.id, name: c.name, price: c.price, ...(c.bom?.length ? { bom: c.bom } : {}) });
    }
  }
  const extra = picked.reduce((s, p) => s + p.price, 0);
  const label = picked.length ? `${productName} (${picked.map((p) => p.name).join(", ")})` : productName;
  return { picked, extra, label };
}
