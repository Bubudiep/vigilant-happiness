import { useAtomValue } from "jotai";

import { TplBottomNav } from "@/templates/_shared/kit";

import { path } from "../constants";
import { cartCountAtom } from "../state";

export type ShopTab = "home" | "category" | "cart" | "account";

/** Thanh tab của mẫu (dùng TplBottomNav chung → BottomNavigation của ZaUI). */
export default function BottomNav() {
  const count = useAtomValue(cartCountAtom);
  return (
    <TplBottomNav
      tabs={[
        { key: "home", label: "Trang chủ", icon: "zi-home", to: path("") },
        { key: "category", label: "Danh mục", icon: "zi-more-grid", to: path("/category") },
        { key: "cart", label: "Giỏ hàng", icon: "zi-inbox", to: path("/cart"), badge: count },
        { key: "account", label: "Tài khoản", icon: "zi-user", to: path("/account") },
      ]}
    />
  );
}
