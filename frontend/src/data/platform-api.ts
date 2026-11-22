import { getStoredAuthToken } from "./auth";
import { siteConfig } from "./site";

/** Lỗi API kèm mã HTTP để giao diện phân biệt "chưa đăng nhập" / "không có quyền" / "mất kết nối". */
/** Phát khi API trả 401 với token đang lưu (phiên hết hạn / bị thu hồi). */
export const AUTH_EXPIRED_EVENT = "recloud:auth-expired";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getStoredAuthToken();
  let res: Response;
  try {
    res = await fetch(`${siteConfig.apiUrl}${path}`, {
      ...init,
      headers: {
        ...(typeof init.body === "string" ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init.headers ?? {}),
      },
    });
  } catch {
    throw new ApiError("Không kết nối được máy chủ (backend chưa chạy?)", 0);
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = Array.isArray(body?.message) ? body.message[0] : body?.message || body?.error_description;
    if (res.status === 401) {
      // App lắng nghe sự kiện này để đăng xuất và về trang đăng nhập
      if (token) window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
      throw new ApiError("Phiên đăng nhập hết hạn — vui lòng đăng nhập lại bằng Google", 401);
    }
    if (res.status === 403) throw new ApiError(msg || "Tài khoản không có quyền (cần nằm trong ADMIN_EMAILS)", 403);
    throw new ApiError(msg || `Lỗi ${res.status}`, res.status);
  }
  return body as T;
}

// ───────────────────────── Yêu cầu tư vấn & lịch gọi lại ─────────────────────────

export type LeadStatus = "NEW" | "CONTACTED" | "CONVERTED" | "ARCHIVED";

export interface Lead {
  id: string;
  name: string;
  phone: string;
  industry?: string | null;
  templateId?: string | null;
  note?: string | null;
  status: LeadStatus;
  source: string;
  requestType: "consultation" | "callback";
  callbackDate?: string | null;
  callbackSlot?: string | null;
  phoneVerified: boolean;
  staffNote?: string | null;
  contactedAt?: string | null;
  createdAt: string;
  user?: { id: string; name: string; avatarUrl?: string | null; provider: string } | null;
}

export function fetchLeads(params: { requestType?: string; status?: string; from?: string; to?: string } = {}) {
  const q = new URLSearchParams(Object.entries(params).filter(([, v]) => !!v) as [string, string][]);
  return api<Lead[]>(`/leads${q.toString() ? `?${q}` : ""}`);
}

export function updateLead(id: string, data: { status?: LeadStatus; staffNote?: string }) {
  return api<Lead>(`/leads/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

// ───────────────────────── Kênh kết nối OAuth (client_id / secret) ─────────────────────────

export type Channel = "zalo_mini_app" | "web" | "pos" | "api" | "webhook";

export interface OAuthApp {
  id: string;
  name: string;
  channel: Channel;
  clientId: string;
  clientType: "confidential" | "public";
  secretHint?: string | null;
  grantTypes: string[];
  scopes: string[];
  redirectUris: string[];
  customerId?: string | null;
  storeId?: string | null;
  accessTokenTtl: number;
  refreshTokenTtl: number;
  active: boolean;
  lastUsedAt?: string | null;
  createdAt: string;
  activeTokens?: number;
  customer?: { id: string; name: string; companyName?: string | null } | null;
  /** Chỉ có trong response tạo mới / xoay vòng secret */
  clientSecret?: string | null;
}

export const fetchOAuthApps = () => api<OAuthApp[]>("/oauth/applications");

export const createOAuthApp = (data: { name: string; channel: Channel; scopes?: string[]; storeId?: string }) =>
  api<OAuthApp>("/oauth/applications", { method: "POST", body: JSON.stringify(data) });

export const updateOAuthApp = (id: string, data: Partial<Pick<OAuthApp, "name" | "active" | "scopes">>) =>
  api<OAuthApp>(`/oauth/applications/${id}`, { method: "PATCH", body: JSON.stringify(data) });

export const rotateOAuthSecret = (id: string) => api<OAuthApp>(`/oauth/applications/${id}/rotate-secret`, { method: "POST" });

export const revokeOAuthTokens = (id: string) => api<{ revoked: boolean }>(`/oauth/applications/${id}/revoke-tokens`, { method: "POST" });

export const deleteOAuthApp = (id: string) => api<{ deleted: boolean }>(`/oauth/applications/${id}`, { method: "DELETE" });

// ───────────────────────── Dự án & ticket (cổng khách hàng) ─────────────────────────

export interface PlatformCustomerLite {
  id: string;
  name: string;
  companyName?: string | null;
  phone: string;
}

export interface Milestone {
  id: string;
  title: string;
  status: "todo" | "doing" | "done";
  dueDate?: string | null;
  doneAt?: string | null;
  sortOrder: number;
}

export interface Project {
  id: string;
  customerId: string;
  name: string;
  templateId?: string | null;
  status: string;
  progress: number;
  startDate?: string | null;
  dueDate?: string | null;
  note?: string | null;
  updatedAt: string;
  customer?: PlatformCustomerLite;
  milestones: Milestone[];
  _count?: { tickets: number };
}

export interface TicketRow {
  id: string;
  code: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  lastReplyAt: string;
  createdAt: string;
  customer?: PlatformCustomerLite;
  messages: { authorType: string; body: string; createdAt: string }[];
}

export interface TicketFull extends Omit<TicketRow, "messages"> {
  messages: { id: string; authorType: string; authorName: string; body: string; createdAt: string }[];
  project?: { id: string; name: string } | null;
}

export const fetchPlatformCustomers = () => api<PlatformCustomerLite[]>("/customers");
export const createPlatformCustomer = (data: { name: string; phone: string; companyName?: string }) =>
  api<PlatformCustomerLite>("/customers", { method: "POST", body: JSON.stringify(data) });

export const fetchProjects = () => api<Project[]>("/admin/projects");
export const createProject = (data: { customerId: string; name: string; templateId?: string; status?: string; dueDate?: string; milestones?: string[] }) =>
  api<Project>("/admin/projects", { method: "POST", body: JSON.stringify(data) });
export const updateProject = (id: string, data: Partial<Pick<Project, "name" | "status" | "progress" | "note" | "dueDate" | "startDate">>) =>
  api<Project>(`/admin/projects/${id}`, { method: "PATCH", body: JSON.stringify(data) });
export const deleteProject = (id: string) => api(`/admin/projects/${id}`, { method: "DELETE" });
export const addMilestone = (projectId: string, title: string) =>
  api<Milestone>(`/admin/projects/${projectId}/milestones`, { method: "POST", body: JSON.stringify({ title }) });
export const updateMilestone = (id: string, data: Partial<Pick<Milestone, "status" | "title">>) =>
  api<Milestone>(`/admin/milestones/${id}`, { method: "PATCH", body: JSON.stringify(data) });
export const deleteMilestone = (id: string) => api(`/admin/milestones/${id}`, { method: "DELETE" });

export const fetchTickets = (status?: string) => api<TicketRow[]>(`/admin/tickets${status ? `?status=${status}` : ""}`);
export const fetchTicketFull = (id: string) => api<TicketFull>(`/admin/tickets/${id}`);
export const updateTicket = (id: string, data: { status?: string; priority?: string }) =>
  api<TicketRow>(`/admin/tickets/${id}`, { method: "PATCH", body: JSON.stringify(data) });
export const staffReply = (id: string, body: string, status?: string) =>
  api<TicketFull>(`/admin/tickets/${id}/messages`, { method: "POST", body: JSON.stringify({ body, status }) });

// ───────────────────────── Chống spam ─────────────────────────

export interface SpamEvent {
  id: string;
  route: string;
  ip?: string | null;
  phone?: string | null;
  action: "blocked" | "flagged";
  score: number;
  reasons: string[];
  sample?: string | null;
  createdAt: string;
}

export interface SpamBlock {
  id: string;
  kind: "ip" | "phone" | "user";
  value: string;
  reason: string;
  source: "manual" | "auto";
  hits: number;
  expiresAt?: string | null;
  createdAt: string;
}

export const fetchSpamStats = () => api<{ last7Days: { blocked: number; flagged: number }; activeBlocks: number }>("/antispam/stats");
export const fetchSpamEvents = (action?: string) => api<SpamEvent[]>(`/antispam/events${action ? `?action=${action}` : ""}`);
export const fetchSpamBlocks = () => api<SpamBlock[]>("/antispam/blocks");
export const addSpamBlock = (data: { kind: string; value: string; reason: string; hours?: number }) =>
  api<SpamBlock>("/antispam/blocks", { method: "POST", body: JSON.stringify(data) });
export const removeSpamBlock = (id: string) => api(`/antispam/blocks/${id}`, { method: "DELETE" });
export const fetchSpamLeads = () => api<Lead[]>("/leads?spam=only");
export const markLeadSpam = (id: string, spam: boolean) => api<Lead>(`/leads/${id}`, { method: "PATCH", body: JSON.stringify({ spam }) });

// ───────────────────────── Khách hàng nền tảng & nhân sự ─────────────────────────

export interface PlatformCustomerRow extends PlatformCustomerLite {
  email?: string | null;
  address?: string | null;
  taxCode?: string | null;
  status: string;
  note?: string | null;
  createdAt: string;
  _count: { stores: number; subscriptions: number; staff: number };
  /** Tài khoản Google đăng nhập web quản trị gắn với khách này */
  users?: { id: string; email?: string | null; name: string; avatarUrl?: string | null }[];
  subscriptions: { expiresAt: string; plan: { name: string } }[];
}

export interface StaffRow {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  role: string;
  active: boolean;
  store?: { id: string; name: string } | null;
}

export interface PlatformCustomerDetail extends PlatformCustomerRow {
  staff: StaffRow[];
  stores: { id: string; name: string; slug: string; active: boolean; templateId: string }[];
}

export const fetchCustomerRows = () => api<PlatformCustomerRow[]>("/customers");
export const fetchCustomerDetail = (id: string) => api<PlatformCustomerDetail>(`/customers/${id}`);
export const saveCustomer = (id: string | null, data: Record<string, unknown>) =>
  id
    ? api<PlatformCustomerRow>(`/customers/${id}`, { method: "PATCH", body: JSON.stringify(data) })
    : api<PlatformCustomerRow>("/customers", { method: "POST", body: JSON.stringify(data) });
/** active: kích hoạt người bán · suspended: tạm khoá · pending: chờ duyệt */
export const setCustomerStatus = (id: string, status: "active" | "pending" | "suspended") =>
  api<PlatformCustomerRow>(`/customers/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
export const deleteCustomer = (id: string) => api(`/customers/${id}`, { method: "DELETE" });
export const addStaff = (customerId: string, data: { name: string; phone: string; role?: string }) =>
  api<StaffRow>(`/customers/${customerId}/staff`, { method: "POST", body: JSON.stringify(data) });
export const removeStaff = (staffId: string) => api(`/customers/staff/${staffId}`, { method: "DELETE" });

// ───────────────────────── Tài khoản quản trị ─────────────────────────

export interface AccountRow {
  id: string;
  name: string;
  email?: string | null;
  avatarUrl?: string | null;
  role: string;
  isAdmin: boolean;
  /** Là quản trị nhờ ADMIN_EMAILS trong .env (không gỡ được ở giao diện) */
  adminViaEnv: boolean;
  lastLoginAt: string;
  customer?: { id: string; name: string; companyName?: string | null; status: string } | null;
}

export const fetchAccounts = () => api<AccountRow[]>("/admin/accounts");
export const setAccountRole = (id: string, role: "admin" | "owner") =>
  api(`/admin/accounts/${id}`, { method: "PATCH", body: JSON.stringify({ role }) });

// ───────────────────────── Nhật ký thao tác ─────────────────────────

export interface AuditRow {
  id: string;
  actorLabel: string;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  meta?: Record<string, unknown> | null;
  ip?: string | null;
  createdAt: string;
}
export const fetchAudit = (action?: string) => api<AuditRow[]>(`/admin/audit${action ? `?action=${encodeURIComponent(action)}` : ""}`);

// ───────────────────────── Công nợ khách hàng ─────────────────────────

export type DebtStatus = "unpaid" | "partial" | "paid" | "overdue";

export interface DebtPaymentRow {
  id: string;
  amount: number;
  paidAt: string;
  method?: string | null;
  note?: string | null;
}

export interface DebtRow {
  id: string;
  customerId: string;
  customer: { id: string; name: string; companyName?: string | null; phone: string };
  title: string;
  amount: number;
  paid: number;
  remaining: number;
  status: DebtStatus;
  dueDate?: string | null;
  note?: string | null;
  createdAt: string;
  payments: DebtPaymentRow[];
}

export interface DebtSummary {
  totalDebt: number;
  overdueAmount: number;
  overdueCount: number;
  debtorCount: number;
  collectedTotal: number;
}

export const fetchDebts = (status?: string) => api<{ items: DebtRow[]; summary: DebtSummary }>(`/debts${status ? `?status=${status}` : ""}`);
export const createDebt = (data: { customerId: string; title: string; amount: number; dueDate?: string; note?: string }) =>
  api<DebtRow>("/debts", { method: "POST", body: JSON.stringify(data) });
export const updateDebt = (id: string, data: { title?: string; amount?: number; dueDate?: string; note?: string }) =>
  api<DebtRow>(`/debts/${id}`, { method: "PATCH", body: JSON.stringify(data) });
export const deleteDebt = (id: string) => api(`/debts/${id}`, { method: "DELETE" });
export const addDebtPayment = (id: string, data: { amount: number; paidAt?: string; method?: string; note?: string }) =>
  api<DebtRow>(`/debts/${id}/payments`, { method: "POST", body: JSON.stringify(data) });
export const removeDebtPayment = (paymentId: string) => api<DebtRow>(`/debts/payments/${paymentId}`, { method: "DELETE" });
