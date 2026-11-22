import { api } from "./platform-api";
import type { StoreConfig } from "./store-api";

/**
 * Các màn hình vận hành (Lịch hẹn, Sự kiện, Tài liệu, Hạng & Voucher, Đơn hàng, Kho) sửa store qua
 * `updateCurrentStore`. Hàm này so bản trước / sau theo id và đẩy đúng thay đổi lên máy chủ:
 * thêm → POST, xoá → DELETE, sửa → PATCH. Bản ghi mới nhận id thật từ máy chủ.
 */
type Item = { id: string } & Record<string, unknown>;

const COLLECTIONS: { key: keyof StoreConfig; path: string; create: boolean; remove: boolean }[] = [
  { key: "bookings", path: "data/bookings", create: true, remove: true },
  { key: "events", path: "data/events", create: true, remove: true },
  { key: "documents", path: "data/documents", create: true, remove: true },
  { key: "memberTiers", path: "data/member-tiers", create: true, remove: true },
  { key: "vouchers", path: "data/vouchers", create: true, remove: true },
  // Đơn hàng do khách đặt từ Mini App — ở đây chỉ đổi trạng thái
  { key: "orders", path: "data/orders", create: false, remove: false },
  // Sản phẩm thêm/xoá ở trang Sản phẩm (gọi API trực tiếp) — ở đây chỉ đồng bộ chỉnh sửa (VD tồn kho ở trang Kho)
  { key: "products", path: "products", create: false, remove: false },
];

const strip = ({ id: _id, createdAt: _c, updatedAt: _u, ...rest }: Item) => rest;

/**
 * Trả về các bản ghi được máy chủ tạo mới: id tạm → bản ghi thật.
 * `idMap` (id tạm → id thật) dùng chung giữa các lần gọi: thay đổi tiếp theo trên bản ghi vừa tạo
 * (VD tạo lịch rồi đổi trạng thái ngay) vẫn PATCH đúng id thật.
 */
export async function syncStoreChanges(prev: StoreConfig, next: StoreConfig, idMap: Record<string, string> = {}) {
  const real = (id: string) => idMap[id] ?? id;
  const replaced: { key: keyof StoreConfig; tempId: string; item: Item }[] = [];
  for (const c of COLLECTIONS) {
    const before = (prev[c.key] as Item[] | undefined) ?? [];
    const after = (next[c.key] as Item[] | undefined) ?? [];
    if (before === after) continue;
    const beforeMap = new Map(before.map((i) => [real(i.id), i]));
    const afterIds = new Set(after.map((i) => real(i.id)));

    for (const item of after) {
      const id = real(item.id);
      const old = beforeMap.get(id);
      if (!old) {
        if (!c.create) continue;
        const created = await api<Item>(`/stores/${next.id}/${c.path}`, { method: "POST", body: JSON.stringify(strip(item)) });
        idMap[item.id] = created.id;
        replaced.push({ key: c.key, tempId: item.id, item: created });
      } else if (JSON.stringify(old) !== JSON.stringify(item)) {
        // Chỉ gửi các trường đã đổi
        const diff: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(strip(item))) if (JSON.stringify(old[k]) !== JSON.stringify(v)) diff[k] = v;
        if (Object.keys(diff).length) {
          await api(`/stores/${next.id}/${c.path}/${id}`, { method: "PATCH", body: JSON.stringify(diff) });
        }
      }
    }
    if (c.remove) {
      for (const old of before) {
        if (!afterIds.has(real(old.id))) await api(`/stores/${next.id}/${c.path}/${real(old.id)}`, { method: "DELETE" });
      }
    }
  }
  return replaced;
}
