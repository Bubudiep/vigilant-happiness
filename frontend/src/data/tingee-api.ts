import { api } from "./platform-api";

/** Cấu hình Tingee của gian hàng (Thiết lập → Xác nhận chuyển khoản tự động) */
export interface TingeeConfig {
  clientId: string;
  hasSecret: boolean;
  /** /api/tingee/webhook/<slug> — dán vào cổng Tingee */
  webhookPath: string;
  transactions: {
    id: string;
    transactionCode: string;
    amount: number;
    content: string | null;
    bank: string | null;
    transactionDate: string | null;
    matchedRef: string | null;
    createdAt: string;
  }[];
}

/** Yêu cầu thanh toán chuyển khoản — ref nằm trong nội dung CK của mã QR */
export interface PaymentRequest {
  id: string;
  ref: string;
  amount: number;
  status: "pending" | "partial" | "paid";
  paidAmount: number;
  paidAt: string | null;
  transactionCode: string | null;
}

export const fetchTingee = (storeId: string) =>
  api<TingeeConfig>(`/stores/${storeId}/tingee`);
export const saveTingee = (
  storeId: string,
  data: { clientId?: string; secretToken?: string },
) =>
  api<TingeeConfig>(`/stores/${storeId}/tingee`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
export const createPaymentRequest = (
  storeId: string,
  data: { amount: number; note?: string },
) =>
  api<PaymentRequest>(`/stores/${storeId}/payment-requests`, {
    method: "POST",
    body: JSON.stringify(data),
  });
export const fetchPaymentRequest = (storeId: string, id: string) =>
  api<PaymentRequest>(`/stores/${storeId}/payment-requests/${id}`);
