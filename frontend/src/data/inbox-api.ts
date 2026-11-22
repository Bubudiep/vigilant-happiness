import { api } from "./platform-api";

/** Hộp thư chăm sóc khách, ảnh khách, việc chăm sóc, kết nối Zalo OA (backend /api/inbox/*). */

export type Channel = "miniapp" | "oa";

export interface ConversationRow {
  id: string;
  channel: Channel;
  externalKey: string;
  customerId?: string | null;
  customer?: { id: string; name: string; companyName?: string | null; phone?: string } | null;
  displayName: string;
  avatarUrl?: string | null;
  phone?: string | null;
  status: "open" | "closed";
  unreadStaff: number;
  lastMessageAt: string;
  lastPreview?: string | null;
}

export interface InboxMessage {
  id: string;
  direction: "in" | "out" | "note";
  kind: "text" | "image";
  body?: string | null;
  image?: { id: string; filename: string; size: number; url: string } | null;
  staffLabel?: string | null;
  delivery: "sent" | "failed";
  error?: string | null;
  createdAt: string;
}

export interface ConversationDetail extends ConversationRow {
  messages: InboxMessage[];
}

export interface GalleryImage {
  id: string;
  filename: string;
  size: number;
  mime: string;
  tag?: string | null;
  note?: string | null;
  source: "customer" | "staff";
  url: string;
  createdAt: string;
  customer?: { id: string; name: string; companyName?: string | null } | null;
  conversation?: { id: string; displayName: string; channel: Channel } | null;
}

export interface CareTaskRow {
  id: string;
  title: string;
  note?: string | null;
  dueAt: string;
  doneAt?: string | null;
  customer?: { id: string; name: string; companyName?: string | null; phone: string } | null;
  conversation?: { id: string; displayName: string; channel: Channel } | null;
}

export interface OaStatus {
  configured: boolean;
  webhookReady: boolean;
  tokenExpiresAt: string | null;
  canRefresh: boolean;
  missing: string[];
}

export interface InboxSummary {
  unread: number;
  open: number;
  careDue: number;
}

const qs = (o: Record<string, string | undefined>) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(o)) if (v) p.set(k, v);
  const s = p.toString();
  return s ? `?${s}` : "";
};

export const fetchInboxSummary = () => api<InboxSummary>("/inbox/summary");
export const fetchConversations = (f: { status?: string; channel?: string; q?: string }) => api<ConversationRow[]>(`/inbox/conversations${qs(f)}`);
export const fetchConversation = (id: string) => api<ConversationDetail>(`/inbox/conversations/${id}`);
export const patchConversation = (id: string, data: { status?: string; customerId?: string | null; displayName?: string }) =>
  api<ConversationRow>(`/inbox/conversations/${id}`, { method: "PATCH", body: JSON.stringify(data) });

export function sendStaffMessage(id: string, data: { body?: string; internal?: boolean; file?: File | null }) {
  const fd = new FormData();
  if (data.body) fd.set("body", data.body);
  if (data.internal) fd.set("internal", "true");
  if (data.file) fd.set("file", data.file);
  return api<InboxMessage>(`/inbox/conversations/${id}/messages`, { method: "POST", body: fd });
}

export const fetchGallery = (f: { customerId?: string; tag?: string; source?: string; q?: string }) => api<GalleryImage[]>(`/inbox/files${qs(f)}`);
export const patchImage = (id: string, data: { tag?: string; note?: string; customerId?: string | null }) =>
  api<GalleryImage>(`/inbox/files/${id}`, { method: "PATCH", body: JSON.stringify(data) });
export const deleteImage = (id: string) => api(`/inbox/files/${id}`, { method: "DELETE" });
export function uploadCustomerImage(customerId: string, file: File, tag?: string, note?: string) {
  const fd = new FormData();
  fd.set("file", file);
  if (tag) fd.set("tag", tag);
  if (note) fd.set("note", note);
  return api<GalleryImage>(`/inbox/customers/${customerId}/files`, { method: "POST", body: fd });
}

export const fetchCare = (f: { status?: string; customerId?: string }) => api<CareTaskRow[]>(`/inbox/care${qs(f)}`);
export const createCare = (data: { title: string; dueAt: string; note?: string; customerId?: string; conversationId?: string }) =>
  api<CareTaskRow>("/inbox/care", { method: "POST", body: JSON.stringify(data) });
export const patchCare = (id: string, data: { title?: string; note?: string; dueAt?: string; done?: boolean }) =>
  api<CareTaskRow>(`/inbox/care/${id}`, { method: "PATCH", body: JSON.stringify(data) });
export const deleteCare = (id: string) => api(`/inbox/care/${id}`, { method: "DELETE" });

export const fetchOaStatus = () => api<OaStatus>("/inbox/oa/status");
export const saveOaCredentials = (accessToken: string, refreshToken: string) =>
  api<OaStatus>("/inbox/oa/credentials", { method: "PUT", body: JSON.stringify({ accessToken, refreshToken }) });

// ── Hộp thư OA riêng của gian hàng + thiết lập OA (backend /api/stores/:id/...) ──

/** Cùng bộ thao tác với hộp thư reMini nhưng ở phạm vi một gian hàng. */
export const storeInboxOps = (storeId: string) => ({
  list: (f: { status?: string; channel?: string; q?: string }) => api<ConversationRow[]>(`/stores/${storeId}/inbox/conversations${qs({ status: f.status, q: f.q })}`),
  get: (id: string) => api<ConversationDetail>(`/stores/${storeId}/inbox/conversations/${id}`),
  patch: (id: string, data: { status?: string; displayName?: string }) =>
    api<ConversationRow>(`/stores/${storeId}/inbox/conversations/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  send(id: string, data: { body?: string; internal?: boolean; file?: File | null }) {
    const fd = new FormData();
    if (data.body) fd.set("body", data.body);
    if (data.internal) fd.set("internal", "true");
    if (data.file) fd.set("file", data.file);
    return api<InboxMessage>(`/stores/${storeId}/inbox/conversations/${id}/messages`, { method: "POST", body: fd });
  },
});

export const platformInboxOps = {
  list: fetchConversations,
  get: fetchConversation,
  patch: patchConversation,
  send: sendStaffMessage,
};

export interface StoreOaStatus extends OaStatus {
  oaId: string;
  hasOaSecret: boolean;
  webhookPath: string;
}

export const fetchStoreOa = (storeId: string) => api<StoreOaStatus>(`/stores/${storeId}/oa`);
export const saveStoreOa = (storeId: string, data: { oaId?: string; oaSecret?: string; accessToken?: string; refreshToken?: string }) =>
  api<StoreOaStatus>(`/stores/${storeId}/oa`, { method: "PUT", body: JSON.stringify(data) });
export const disconnectStoreOa = (storeId: string) => api<StoreOaStatus>(`/stores/${storeId}/oa/token`, { method: "DELETE" });

// ── Yêu cầu build Mini App riêng ──

export type BuildStatus = "pending_admin" | "pending_zalo" | "published" | "rejected" | "cancelled";

export interface BuildRequestRow {
  id: string;
  status: BuildStatus;
  appName?: string | null;
  appId?: string | null;
  note?: string | null;
  adminNote?: string | null;
  publishedUrl?: string | null;
  approvedAt?: string | null;
  publishedAt?: string | null;
  closedAt?: string | null;
  createdAt: string;
  store?: { id: string; name: string; slug: string; templateId: string; customer?: { id: string; name: string; companyName?: string | null; phone: string } | null };
}

export const fetchStoreBuilds = (storeId: string) => api<BuildRequestRow[]>(`/stores/${storeId}/build-requests`);
export const createStoreBuild = (storeId: string, data: { appName?: string; appId?: string; note?: string }) =>
  api<BuildRequestRow>(`/stores/${storeId}/build-requests`, { method: "POST", body: JSON.stringify(data) });
export const cancelStoreBuild = (storeId: string, id: string) => api<BuildRequestRow>(`/stores/${storeId}/build-requests/${id}/cancel`, { method: "POST" });

export const fetchAdminBuilds = (status?: string) => api<BuildRequestRow[]>(`/admin/build-requests${qs({ status })}`);
export const reviewBuild = (id: string, data: { action: "approve" | "publish" | "reject"; adminNote?: string; appId?: string; publishedUrl?: string }) =>
  api<BuildRequestRow>(`/admin/build-requests/${id}`, { method: "PATCH", body: JSON.stringify(data) });
