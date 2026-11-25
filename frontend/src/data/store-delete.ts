import { api } from "./platform-api";

/** Khoá localStorage lưu gian hàng đang chọn ở trang /admin (StoreConsole). */
export const LAST_STORE_KEY = "recloud_last_store_v1";

export interface DeleteStoreResult {
  id: string;
  name: string;
  deleted: boolean;
  /** số file đã xoá khỏi ổ đĩa */
  files: number;
}

/** Xoá HẲN gian hàng + dữ liệu + file (chỉ admin). 403 chủ shop, 404 không tồn tại. */
export const deleteStore = (id: string) => api<DeleteStoreResult>(`/stores/${id}`, { method: "DELETE" });

/** Chuỗi gõ xác nhận khớp slug (bỏ khoảng trắng hai đầu, không phân biệt hoa/thường). Slug rỗng không bao giờ khớp. */
export function slugConfirmed(input: string, slug: string): boolean {
  const s = slug.trim().toLowerCase();
  return s.length > 0 && input.trim().toLowerCase() === s;
}

/** Nếu gian hàng vừa xoá đang là gian hàng được nhớ ở trang /admin thì quên đi (tránh để lại id chết). Trả true nếu đã xoá khoá. */
export function forgetDeletedStore(id: string, storage: Pick<Storage, "getItem" | "removeItem"> | undefined = typeof localStorage === "undefined" ? undefined : localStorage): boolean {
  try {
    if (storage?.getItem(LAST_STORE_KEY) === id) {
      storage.removeItem(LAST_STORE_KEY);
      return true;
    }
  } catch {
    // bỏ qua
  }
  return false;
}
