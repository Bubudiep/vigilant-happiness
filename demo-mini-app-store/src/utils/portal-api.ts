import { atom } from "jotai";

import { appConfig } from "@/config";

import { getValidAccessToken } from "./auth";

/** Cổng khách hàng: Mini App đã đăng, tiến độ dự án, ticket (backend /api/me/*). */

export interface PortalApp {
  id: string;
  name: string;
  slug: string;
  subtitle?: string | null;
  logoUrl?: string | null;
  templateId: string;
  zaloAppId?: string | null;
  active: boolean;
  updatedAt: string;
  subscription?: { status: string; expiresAt: string; plan: { name: string } } | null;
  _count: { products: number; customers: number; orders: number };
}

export interface Milestone {
  id: string;
  title: string;
  status: "todo" | "doing" | "done";
  dueDate?: string | null;
  doneAt?: string | null;
}

export interface PortalProject {
  id: string;
  name: string;
  templateId?: string | null;
  status: string;
  progress: number;
  startDate?: string | null;
  dueDate?: string | null;
  note?: string | null;
  milestones: Milestone[];
}

export interface TicketSummary {
  id: string;
  code: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  projectId?: string | null;
  lastReplyAt: string;
  createdAt: string;
  messages: { authorType: string; body: string; createdAt: string }[];
}

export interface TicketDetail extends Omit<TicketSummary, "messages"> {
  messages: { id: string; authorType: "customer" | "staff" | "system"; authorName: string; body: string; createdAt: string }[];
  project?: { id: string; name: string } | null;
}

export interface PortalOverview {
  user: { id: string; name: string; phone?: string | null; avatarUrl?: string | null } | null;
  customer: { id: string; name: string; companyName?: string | null; phone: string } | null;
  apps: PortalApp[];
  projects: PortalProject[];
  tickets: TicketSummary[];
  subscriptions: { id: string; status: string; expiresAt: string; plan: { name: string } }[];
}

/** Tin nhắn chưa đọc từ nhân viên reMini — cộng vào chấm đỏ tab "Tài khoản". */
export const unreadMessagesAtom = atom(0);

export interface ChatMessage {
  id: string;
  from: "me" | "staff";
  kind: "text" | "image";
  body?: string | null;
  image?: { url: string } | null;
  createdAt: string;
}

export const fetchMessages = (after?: string) =>
  call<{ messages: ChatMessage[] }>(`/me/messages${after ? `?after=${encodeURIComponent(after)}` : ""}`);
export const fetchUnreadMessages = () => call<{ count: number }>("/me/messages/unread");
export function sendChatMessage(data: { body?: string; image?: Blob | null }) {
  const fd = new FormData();
  if (data.body) fd.set("body", data.body);
  if (data.image) fd.set("file", data.image, "photo.jpg");
  return call<ChatMessage>("/me/messages", { method: "POST", body: fd });
}

/** Số ticket đang chờ khách phản hồi — hiện thành chấm đỏ trên tab "Tài khoản". */
export const pendingTicketsAtom = atom(0);

export const countWaitingTickets = (tickets: { status: string }[]) => tickets.filter((t) => t.status === "waiting_customer").length;

export class PortalError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!appConfig.apiUrl) throw new PortalError("Chưa kết nối máy chủ", 0);
  const token = await getValidAccessToken();
  if (!token) throw new PortalError("Vui lòng đăng nhập Zalo", 401);
  let res: Response;
  try {
    res = await fetch(`${appConfig.apiUrl}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, ...(typeof init.body === "string" ? { "Content-Type": "application/json" } : {}) },
    });
  } catch {
    throw new PortalError("Mất kết nối, vui lòng thử lại", 0);
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = Array.isArray(body?.message) ? body.message[0] : body?.message;
    throw new PortalError(msg || `Lỗi ${res.status}`, res.status);
  }
  return body as T;
}

export const fetchOverview = () => call<PortalOverview>("/me/overview");
export const fetchTicket = (id: string) => call<TicketDetail>(`/me/tickets/${id}`);
export const createTicket = (data: { subject: string; body: string; category?: string; projectId?: string; website?: string }) =>
  call<TicketSummary>("/me/tickets", { method: "POST", body: JSON.stringify(data) });
export const replyTicket = (id: string, body: string, website?: string) =>
  call<TicketDetail>(`/me/tickets/${id}/messages`, { method: "POST", body: JSON.stringify({ body, website }) });
export const closeTicket = (id: string) => call<TicketDetail>(`/me/tickets/${id}/close`, { method: "POST" });

/** Token chống spam: lấy khi mở form, gửi kèm khi submit (backend kiểm tra thời gian điền form). */
export async function fetchFormToken(): Promise<string | undefined> {
  if (!appConfig.apiUrl) return undefined;
  try {
    const res = await fetch(`${appConfig.apiUrl}/antispam/form-token`);
    return res.ok ? ((await res.json()) as { token: string }).token : undefined;
  } catch {
    return undefined;
  }
}

export const PROJECT_STATUS: Record<string, { label: string; color: string }> = {
  consulting: { label: "Tư vấn", color: "#64748b" },
  designing: { label: "Thiết kế", color: "#8b5cf6" },
  developing: { label: "Lập trình", color: "#2563eb" },
  testing: { label: "Kiểm thử", color: "#0891b2" },
  zalo_review: { label: "Chờ Zalo duyệt", color: "#d97706" },
  live: { label: "Đang hoạt động", color: "#16a34a" },
  maintenance: { label: "Bảo trì", color: "#0f766e" },
  paused: { label: "Tạm dừng", color: "#9ca3af" },
};

export const TICKET_STATUS: Record<string, { label: string; color: string }> = {
  open: { label: "Chờ xử lý", color: "#d97706" },
  in_progress: { label: "Đang xử lý", color: "#2563eb" },
  waiting_customer: { label: "Chờ bạn phản hồi", color: "#db2777" },
  resolved: { label: "Đã giải quyết", color: "#16a34a" },
  closed: { label: "Đã đóng", color: "#9ca3af" },
};

export const TICKET_CATEGORY: Record<string, string> = {
  technical: "Lỗi kỹ thuật",
  content: "Sửa nội dung",
  feature: "Thêm tính năng",
  zalo_review: "Duyệt Zalo",
  billing: "Thanh toán",
};
