import { getStoredAuthToken } from "./auth";
import type { StoreMediaItem } from "./media-usage";
import { api, ApiError, apiErrorFromResponse } from "./platform-api";
import { siteConfig } from "./site";

/**
 * Tải ảnh thiết kế lên máy chủ (POST /stores/:id/media/upload) và trả về URL công khai.
 * Vượt hạn mức dung lượng → ApiError 413 (message do server trả).
 */
export async function uploadStoreMedia(storeId: string, blob: Blob, name: string, type = "general"): Promise<string> {
  const fd = new FormData();
  fd.append("type", type);
  fd.append("file", blob, name);
  const token = getStoredAuthToken();
  let res: Response;
  try {
    res = await fetch(`${siteConfig.apiUrl}/stores/${storeId}/media/upload`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: fd,
    });
  } catch {
    throw new ApiError("Không kết nối được máy chủ", 0);
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) throw apiErrorFromResponse(res.status, body);
  if (!body?.url) throw new ApiError("Máy chủ không trả về URL ảnh", res.status);
  return body.url as string;
}

/** data:image/...;base64,... → Blob */
export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  return (await fetch(dataUrl)).blob();
}

/** Thư viện ảnh của gian hàng (lọc theo loại: logo | banner | product | general). */
export const fetchStoreMedia = (storeId: string, type?: string) =>
  api<StoreMediaItem[]>(`/stores/${storeId}/media${type && type !== "all" ? `?type=${encodeURIComponent(type)}` : ""}`);
export type DeleteMediaResult = { deleted: true } | { deleted: false; conflict: true; usedIn: string[]; message: string };

/**
 * Xoá ảnh. Ảnh đang dùng và chưa `force` → server trả 409 { message, usedIn }: trả về conflict để UI hỏi lại;
 * `force` → gửi ?force=1 để xoá hẳn. Lỗi khác được ném ra như bình thường.
 */
export async function deleteStoreMedia(mediaId: string, force = false): Promise<DeleteMediaResult> {
  try {
    await api(`/stores/media/${mediaId}${force ? "?force=1" : ""}`, { method: "DELETE" });
    return { deleted: true };
  } catch (e) {
    if (e instanceof ApiError && e.status === 409) {
      const d = e.data as { usedIn?: unknown } | undefined;
      return { deleted: false, conflict: true, usedIn: Array.isArray(d?.usedIn) ? (d.usedIn as unknown[]).map(String) : [], message: e.message };
    }
    throw e;
  }
}
