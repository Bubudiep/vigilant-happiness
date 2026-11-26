import { getStoredAuthToken } from "./auth";
import { api, ApiError, apiErrorFromResponse } from "./platform-api";
import { siteConfig } from "./site";

/** key của loại album (shop tự tạo ở "Loại album"; mặc định today | wedding | engagement | other) */
export type AlbumKind = string;

export interface AlbumKindDef {
  key: string;
  label: string;
  color: string;
  /** camera | heart | gem | images | baby | cake | graduation | users | gift | sparkles | flower | party | plane | briefcase | paw | shirt | star */
  icon: string;
  hint?: string;
}

export interface AlbumLink {
  label: string;
  url: string;
  /** google_drive | google_photos | onedrive | dropbox | icloud | fshare | link */
  provider?: string;
}

export interface AlbumPhoto {
  id: string;
  filename: string;
  width?: number | null;
  height?: number | null;
  size: number;
  url: string;
  /** Ảnh thu nhỏ 400px cho lưới (ảnh cũ chưa có thì server trả ảnh gốc). */
  thumbUrl?: string;
}

export interface AlbumSummary {
  id: string;
  customerId: string;
  customer?: { id: string; name: string; phone: string };
  title: string;
  kind: AlbumKind;
  eventDate: string | null;
  note: string | null;
  links: AlbumLink[];
  coverPhotoId: string | null;
  coverUrl: string | null;
  photoCount: number;
  status: "draft" | "published";
  publishedAt: string | null;
  viewedAt: string | null;
  createdAt: string;
}

export interface AlbumDetail extends AlbumSummary {
  photos: AlbumPhoto[];
}

/** Thẻ "Kết quả buổi liệu trình" gửi cho khách */
export interface TreatmentResultCard {
  type: "treatment_result";
  bookingId: string;
  treatmentName: string;
  serviceName: string;
  seq: number;
  total: number;
  done: number;
  date: string;
  timeSlot: string;
  staffName?: string | null;
  result: string;
  next?: { seq: number; date: string; timeSlot: string } | null;
}

export interface StoreMessage {
  id: string;
  direction: "in" | "out";
  body: string;
  albumId?: string | null;
  card?: TreatmentResultCard | null;
  readAt?: string | null;
  createdAt: string;
}

export interface AlbumInput {
  customerId?: string;
  title?: string;
  kind?: AlbumKind;
  eventDate?: string | null;
  note?: string | null;
  links?: { label: string; url: string }[];
  coverPhotoId?: string | null;
}

const base = (storeId: string) => `/stores/${storeId}`;

export const fetchAlbums = (storeId: string, q: { customerId?: string; kind?: string } = {}) => {
  const p = new URLSearchParams(Object.entries(q).filter(([, v]) => !!v) as [string, string][]);
  return api<AlbumSummary[]>(`${base(storeId)}/albums${p.toString() ? `?${p}` : ""}`);
};
export const fetchAlbumKinds = (storeId: string) => api<AlbumKindDef[]>(`${base(storeId)}/album-kinds`);
/** key bỏ trống = loại mới. Album của loại bị xoá chuyển sang "Khác" (moved = số album bị chuyển). */
export const saveAlbumKinds = (storeId: string, kinds: (Omit<AlbumKindDef, "key"> & { key?: string })[]) =>
  api<{ kinds: AlbumKindDef[]; moved: number }>(`${base(storeId)}/album-kinds`, { method: "PUT", body: JSON.stringify({ kinds }) });
export const fetchAlbum = (storeId: string, id: string) => api<AlbumDetail>(`${base(storeId)}/albums/${id}`);
export const createAlbum = (storeId: string, data: AlbumInput) =>
  api<AlbumDetail>(`${base(storeId)}/albums`, { method: "POST", body: JSON.stringify(data) });
export const updateAlbum = (storeId: string, id: string, data: AlbumInput) =>
  api<AlbumDetail>(`${base(storeId)}/albums/${id}`, { method: "PATCH", body: JSON.stringify(data) });
export const deleteAlbum = (storeId: string, id: string) => api(`${base(storeId)}/albums/${id}`, { method: "DELETE" });
export const deleteAlbumPhoto = (storeId: string, id: string, photoId: string) =>
  api(`${base(storeId)}/albums/${id}/photos/${photoId}`, { method: "DELETE" });
export const publishAlbum = (storeId: string, id: string, message?: string) =>
  api<AlbumDetail>(`${base(storeId)}/albums/${id}/publish`, { method: "POST", body: JSON.stringify({ message }) });
export const unpublishAlbum = (storeId: string, id: string) =>
  api<AlbumDetail>(`${base(storeId)}/albums/${id}/unpublish`, { method: "POST" });

export const fetchStoreUnread = (storeId: string) => api<Record<string, number>>(`${base(storeId)}/messages/unread`);
export interface Conversation {
  customerId: string;
  lastBody: string;
  lastDirection: "in" | "out";
  lastAt: string;
  lastReadAt: string | null;
  unread: number;
}
export const fetchConversations = (storeId: string) => api<Conversation[]>(`${base(storeId)}/messages/conversations`);
export const fetchStoreThread = (storeId: string, customerId: string) => api<StoreMessage[]>(`${base(storeId)}/messages/${customerId}`);
export const sendStoreMessage = (storeId: string, customerId: string, body: string) =>
  api<StoreMessage>(`${base(storeId)}/messages/${customerId}`, { method: "POST", body: JSON.stringify({ body }) });

/** Lưu kết quả buổi liệu trình (đánh dấu Hoàn thành) rồi gửi cho khách dạng thẻ trong chat */
export const sendTreatmentResult = (storeId: string, bookingId: string, result: string) =>
  api<{ message: StoreMessage; booking: { id: string; status: string; result: string } }>(`${base(storeId)}/messages/treatment-result/${bookingId}`, {
    method: "POST",
    body: JSON.stringify({ result }),
  });

/** Thu nhỏ ảnh trước khi tải (cạnh dài tối đa 2048px, JPEG 85%) — ảnh gốc để ở link Drive. */
export async function shrinkImage(file: File, maxSide = 2048): Promise<Blob> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
    if (scale === 1 && file.size < 1.5 * 1024 * 1024) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

/** Tải nhiều ảnh (multipart field "files"), trả về số ảnh nhận và lỗi từng file. */
export async function uploadAlbumPhotos(storeId: string, albumId: string, files: { blob: Blob; name: string }[]) {
  const fd = new FormData();
  for (const f of files) fd.append("files", f.blob, f.blob.type === "image/jpeg" ? f.name.replace(/\.[a-z0-9]+$/i, ".jpg") : f.name);
  const token = getStoredAuthToken();
  let res: Response;
  try {
    res = await fetch(`${siteConfig.apiUrl}${base(storeId)}/albums/${albumId}/photos`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: fd,
    });
  } catch {
    throw new ApiError("Không kết nối được máy chủ", 0);
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) throw apiErrorFromResponse(res.status, body);
  return body as { added: AlbumPhoto[]; errors: string[]; quotaExceeded?: boolean };
}
