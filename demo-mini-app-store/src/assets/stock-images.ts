/**
 * Ảnh minh hoạ cho các template demo.
 *
 * Mỗi template có thư mục riêng `./items/<templateId>/`:
 *  - `<itemId>.jpg`   : ảnh đúng với sản phẩm / dịch vụ có id tương ứng trong data.ts
 *  - `banner-<n>.jpg` : ảnh nền cho banner thứ n trên trang chủ
 *
 * Nguồn ảnh: Pexels (giấy phép Pexels) và Wikimedia Commons.
 */
const ITEM_IMAGES = import.meta.glob("./items/*/*.jpg", {
  eager: true,
  import: "default",
}) as Record<string, string>;

/** templateId -> { key -> url } */
const BY_TEMPLATE: Record<string, Record<string, string>> = {};
for (const [path, url] of Object.entries(ITEM_IMAGES)) {
  const m = path.match(/^\.\/items\/([^/]+)\/([^/]+)\.jpg$/);
  if (!m) continue;
  (BY_TEMPLATE[m[1]] ??= {})[m[2]] = url;
}

function stableHash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Ảnh gắn đúng với một item (id) của template, nếu có. */
export function getItemImage(templateId: string | undefined, id: string | number | undefined): string | undefined {
  if (!templateId || id === undefined) return undefined;
  return BY_TEMPLATE[templateId]?.[String(id)];
}

/**
 * Chọn ảnh theo template hiện tại.
 * - banner: seed là index banner -> `banner-<index>.jpg`
 * - product: seed là id sản phẩm -> `<id>.jpg`
 * Nếu không có ảnh đúng id thì lấy một ảnh cùng template (ổn định theo seed).
 */
export function pickStockImage(
  templateId: string | undefined,
  kind: "banner" | "product",
  seed: string | number,
): string | undefined {
  const images = templateId ? BY_TEMPLATE[templateId] : undefined;
  if (!images) return undefined;

  const key = kind === "banner" ? `banner-${seed}` : String(seed);
  if (images[key]) return images[key];

  const pool = Object.entries(images)
    .filter(([k]) => (kind === "banner" ? k.startsWith("banner-") : !k.startsWith("banner-")))
    .map(([, url]) => url);
  if (!pool.length) return undefined;
  const idx = typeof seed === "number" ? Math.abs(seed) : stableHash(seed);
  return pool[idx % pool.length];
}
