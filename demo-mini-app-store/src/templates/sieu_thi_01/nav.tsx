import { useAtomValue } from "jotai";

import { TplBottomNav } from "../_shared/kit";
import { cart, path } from "./data";

export default function Nav() {
  const count = useAtomValue(cart.countAtom);
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
