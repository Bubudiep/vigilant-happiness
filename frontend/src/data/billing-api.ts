import { api } from "./platform-api";
import type {
  CreateOrderInput,
  PaymentMethod,
  StoreBookingItem,
  StoreOrderItem,
} from "./store-api";

/** Thu tiền lịch hẹn, cách thu tiền liệu trình, công nợ — khớp backend stores/billing.service.ts */

export type TreatmentBillingMode = "session" | "package" | "flexible";

export interface TreatmentBilling {
  id: string;
  name: string;
  billing: TreatmentBillingMode;
  price: number;
  orderId?: string | null;
  orderCode?: string;
  paid: number;
  debt: number;
}

export interface CheckoutInput {
  items: CreateOrderInput["items"];
  extraDiscount?: number;
  paymentMethod: PaymentMethod;
  /** Khách trả — thiếu so với tổng thì ghi nợ */
  paid: number;
  /** Thu thêm nợ gói liệu trình */
  treatmentPaid?: number;
  result?: string;
  note?: string;
}

export interface DebtOrder extends StoreOrderItem {
  debt: number;
  payments: {
    id: string;
    amount: number;
    method: string;
    note?: string | null;
    createdAt: string;
  }[];
}

export interface DebtGroup {
  key: string;
  customerId: string | null;
  customerName: string;
  phone: string;
  debt: number;
  orders: DebtOrder[];
}

export const checkoutBooking = (
  storeId: string,
  bookingId: string,
  body: CheckoutInput,
) =>
  api<{ order: StoreOrderItem | null; booking: StoreBookingItem }>(
    `/stores/${storeId}/bookings/${bookingId}/checkout`,
    { method: "POST", body: JSON.stringify(body) },
  );

export const fetchTreatmentBilling = (storeId: string) =>
  api<TreatmentBilling[]>(`/stores/${storeId}/treatments`);

export const saveTreatmentBilling = (
  storeId: string,
  body: {
    treatmentId: string;
    customerName: string;
    phone: string;
    name: string;
    billing: TreatmentBillingMode;
    price: number;
    paid?: number;
    paymentMethod?: PaymentMethod;
  },
) =>
  api<{
    id: string;
    billing: TreatmentBillingMode;
    price: number;
    orderId?: string | null;
  }>(`/stores/${storeId}/treatments`, {
    method: "POST",
    body: JSON.stringify(body),
  });

export const fetchDebts = (storeId: string) =>
  api<DebtGroup[]>(`/stores/${storeId}/debts`);

export const collectDebt = (
  storeId: string,
  body: {
    orderId?: string;
    customerId?: string | null;
    phone?: string;
    amount: number;
    paymentMethod: PaymentMethod;
    note?: string;
  },
) =>
  api<{ collected: number; change: number }>(
    `/stores/${storeId}/debts/collect`,
    { method: "POST", body: JSON.stringify(body) },
  );
