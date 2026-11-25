/** Một tệp trong thư viện ảnh của gian hàng (StoreMedia). */
export interface StoreMediaItem {
  id: string;
  type: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  storageKey: string;
  alt?: string | null;
  createdAt: string;
  /** Do server tính (T44); thiếu thì dùng findMediaInUse ở client */
  inUse?: boolean;
  usedIn?: string[];
}

/**
 * Các media đang được dùng: URL hoặc storageKey của ảnh xuất hiện ở đâu đó trong `source`
 * (sản phẩm, slider, theme, thiết kế builderSchema, logo/cover…). So khớp theo chuỗi trên JSON,
 * giống cách backend kiểm tra khi dọn logo cũ — storageKey giúp khớp cả URL tương đối / khác domain.
 */
export function findMediaInUse(media: Pick<StoreMediaItem, "id" | "url" | "storageKey">[], source: unknown): Set<string> {
  const haystack = JSON.stringify(source ?? null);
  const used = new Set<string>();
  for (const m of media) {
    if ((m.url && haystack.includes(m.url)) || (m.storageKey && haystack.includes(m.storageKey))) used.add(m.id);
  }
  return used;
}

/** Nhãn tiếng Việt cho nơi ảnh đang được dùng (giá trị `usedIn` của server). */
export const USED_IN_LABEL: Record<string, string> = {
  logo: "Logo",
  cover: "Ảnh bìa",
  theme: "Giao diện",
  slider: "Slider",
  design: "Thiết kế",
  banner: "Banner",
  product: "Sản phẩm",
};
export const usedInLabel = (k: string) => USED_IN_LABEL[k] ?? k;

/** Trạng thái dùng của một ảnh: ưu tiên cờ server, thiếu thì dùng kết quả so khớp ở client (không biết nơi dùng). */
export function mediaUsage(m: StoreMediaItem, clientUsed: Set<string>): { inUse: boolean; usedIn: string[] } {
  if (typeof m.inUse === "boolean") return { inUse: m.inUse, usedIn: m.usedIn ?? [] };
  return { inUse: clientUsed.has(m.id), usedIn: m.usedIn ?? [] };
}
