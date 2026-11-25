const DATA_IMAGE_RE = /data:image\/[a-z+.-]+;base64,[A-Za-z0-9+/=]+/g;

/** Các chuỗi data:image duy nhất (không trùng) có trong schema. */
export function findDataImages(schema: unknown): string[] {
  return Array.from(new Set(JSON.stringify(schema).match(DATA_IMAGE_RE) ?? []));
}

/** Thay mọi chỗ xuất hiện của `dataUrl` trong schema bằng `url`. */
export function replaceDataImage<T>(schema: T, dataUrl: string, url: string): T {
  return JSON.parse(JSON.stringify(schema).split(dataUrl).join(url)) as T;
}
