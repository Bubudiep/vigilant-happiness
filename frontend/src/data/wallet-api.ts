import { api } from "./platform-api";
import type { PaymentMethod } from "./store-api";

/** Ví khách — khớp backend stores/wallet.service.ts */
export type WalletKind = "overpay" | "topup" | "pay" | "refund" | "adjust";

export interface WalletTxn {
  id: string;
  /** > 0 vào ví, < 0 ra khỏi ví */
  amount: number;
  balanceAfter: number;
  kind: WalletKind;
  reason: string;
  method?: string | null;
  orderId?: string | null;
  orderCode?: string | null;
  createdBy?: string | null;
  createdAt: string;
}

export const WALLET_KIND: Record<WalletKind, { label: string; color: string }> =
  {
    overpay: { label: "Trả thừa", color: "gold" },
    topup: { label: "Nạp tiền", color: "green" },
    pay: { label: "Trừ vào đơn", color: "blue" },
    refund: { label: "Hoàn tiền", color: "volcano" },
    adjust: { label: "Điều chỉnh", color: "purple" },
  };

export const fetchWallet = (storeId: string, customerId: string) =>
  api<{ balance: number; txns: WalletTxn[] }>(
    `/stores/${storeId}/customers/${customerId}/wallet`,
  );

export const adjustWallet = (
  storeId: string,
  customerId: string,
  body: {
    kind: "topup" | "refund" | "adjust";
    amount: number;
    reason: string;
    paymentMethod?: PaymentMethod;
  },
) =>
  api<{ balance: number }>(
    `/stores/${storeId}/customers/${customerId}/wallet`,
    { method: "POST", body: JSON.stringify(body) },
  );
