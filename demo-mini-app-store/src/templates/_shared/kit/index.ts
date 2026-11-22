/**
 * Bộ component dùng chung cho các mẫu demo.
 * Màu lấy từ `meta.theme` của mẫu (qua context), nên không cần truyền màu thủ công.
 */
export * from "./theme";
export * from "./icons";
export * from "./layout";
export * from "./cart";
export * from "./booking";
export * from "./account";
export * from "./referral";
export * from "./form";
export * from "./product";
export { default as TplBottomNav } from "./bottom-nav";
export type { NavTab, IconName } from "./bottom-nav";
export { useDemoAction } from "../demo-action";
export { formatPrice } from "@/utils/format";
