import { api } from "./platform-api";
import type { PaymentMethod } from "./store-api";

export type TableKind = "table" | "billiards" | "karaoke" | "room" | "other";
export type TableState = "ready" | "reserved" | "cleaning";

export interface PosArea {
  id: string;
  name: string;
  sortOrder: number;
}

export interface PosTable {
  id: string;
  areaId: string | null;
  name: string;
  kind: TableKind;
  seats: number | null;
  /** 0 = không tính giờ */
  pricePerHour: number;
  blockMinutes: number;
  minMinutes: number;
  state: TableState;
  stateNote: string | null;
  active: boolean;
  sortOrder: number;
}

export interface PosItem {
  productId: string | null;
  name: string;
  unitPrice: number;
  quantity: number;
  /** Tuỳ chọn đã chốt (máy chủ trả về) */
  options?: { groupId: string; group: string; choiceId: string; name: string; price: number }[];
  /** Lựa chọn vừa chọn trên web — máy chủ tính lại giá theo cấu hình món */
  selections?: { groupId: string; choiceIds: string[] }[];
}

export interface PosSession {
  id: string;
  tableId: string;
  status: "open" | "closed" | "cancelled";
  startedAt: string;
  endedAt: string | null;
  guestCount: number | null;
  customerId: string | null;
  customerName: string | null;
  note: string | null;
  items: PosItem[];
  pricePerHour: number;
  blockMinutes: number;
  minMinutes: number;
  timeCharge: number;
  itemsTotal: number;
  discount: number;
  total: number;
  orderId: string | null;
  paymentMethod: string | null;
}

export interface PosOverview {
  now: string;
  areas: PosArea[];
  tables: PosTable[];
  sessions: PosSession[];
}

/** Giống backend: làm tròn lên theo block, tối thiểu, tròn 1.000đ — để đồng hồ trên web chạy không cần gọi máy chủ */
export function timeCharge(startedAt: string | Date, now: Date, pricePerHour: number, blockMinutes: number, minMinutes: number) {
  const minutes = Math.max(0, Math.ceil((now.getTime() - new Date(startedAt).getTime()) / 60_000));
  if (!pricePerHour) return { minutes, billedMinutes: 0, charge: 0 };
  const block = Math.max(1, blockMinutes || 1);
  const billedMinutes = Math.max(minMinutes || 0, Math.ceil(minutes / block) * block);
  return { minutes, billedMinutes, charge: Math.round((billedMinutes * pricePerHour) / 60 / 1000) * 1000 };
}

const b = (storeId: string) => `/stores/${storeId}/pos`;
const json = (method: string, body?: unknown) => ({ method, body: body === undefined ? undefined : JSON.stringify(body) });

export const fetchPos = (storeId: string) => api<PosOverview>(b(storeId));
export const createArea = (storeId: string, data: Partial<PosArea>) => api<PosArea>(`${b(storeId)}/areas`, json("POST", data));
export const updateArea = (storeId: string, id: string, data: Partial<PosArea>) => api<PosArea>(`${b(storeId)}/areas/${id}`, json("PATCH", data));
export const deleteArea = (storeId: string, id: string) => api(`${b(storeId)}/areas/${id}`, json("DELETE"));
export const createTable = (storeId: string, data: Partial<PosTable>) => api<PosTable>(`${b(storeId)}/tables`, json("POST", data));
export const createTablesBulk = (storeId: string, data: Partial<PosTable> & { prefix: string; from: number; count: number }) =>
  api<PosOverview>(`${b(storeId)}/tables/bulk`, json("POST", data));
export const updateTable = (storeId: string, id: string, data: Partial<PosTable>) => api<PosTable>(`${b(storeId)}/tables/${id}`, json("PATCH", data));
export const deleteTable = (storeId: string, id: string) => api(`${b(storeId)}/tables/${id}`, json("DELETE"));
export const openTable = (storeId: string, tableId: string, data: { guestCount?: number; customerId?: string; customerName?: string; note?: string }) =>
  api<PosSession>(`${b(storeId)}/tables/${tableId}/open`, json("POST", data));
export const updateSession = (
  storeId: string,
  id: string,
  data: Partial<Pick<PosSession, "items" | "guestCount" | "customerName" | "note" | "discount">> & { customerId?: string | null; startedAt?: string },
) => api<PosSession>(`${b(storeId)}/sessions/${id}`, json("PATCH", data));
export const moveSession = (storeId: string, id: string, tableId: string) => api<PosSession>(`${b(storeId)}/sessions/${id}/move`, json("POST", { tableId }));
export const cancelSession = (storeId: string, id: string) => api<PosSession>(`${b(storeId)}/sessions/${id}/cancel`, json("POST"));
export const checkoutSession = (storeId: string, id: string, data: { paymentMethod: PaymentMethod; discount?: number; cleaning?: boolean }) =>
  api<{ session: PosSession; order: { id: string; code: string; total: number } }>(`${b(storeId)}/sessions/${id}/checkout`, json("POST", data));

// ───────────── Báo cáo ─────────────

export interface RevenueReport {
  from: string;
  to: string;
  summary: {
    revenue: number;
    orders: number;
    avgOrder: number;
    discount: number;
    customers: number;
    newCustomers: number;
    timeRevenue: number;
    /** Giá vốn hàng bán, lợi nhuận gộp, biên lợi nhuận (%), giá trị tồn kho hiện tại */
    cogs: number;
    grossProfit: number;
    margin: number;
    stockValue: number;
    pendingOrders: number;
    pendingAmount: number;
    cancelledOrders: number;
    cancelledAmount: number;
    prevRevenue: number;
    prevOrders: number;
  };
  byDay: { date: string; revenue: number; orders: number }[];
  byHour: { hour: number; revenue: number; orders: number }[];
  bySource: { key: string; revenue: number; orders: number }[];
  byPayment: { key: string; revenue: number; orders: number }[];
  topProducts: { name: string; productId: string | null; quantity: number; revenue: number; cost: number; profit: number }[];
  tables: { tableId: string; name: string; kind: string; sessions: number; minutes: number; revenue: number; timeRevenue: number }[];
  bookings: Record<string, number>;
}

export const fetchReport = (storeId: string, from: string, to: string) => api<RevenueReport>(`/stores/${storeId}/reports?from=${from}&to=${to}`);
