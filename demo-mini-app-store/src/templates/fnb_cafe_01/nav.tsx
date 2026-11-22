import { useAtomValue } from "jotai";

import { TplBottomNav } from "../_shared/kit";
import { cart, path } from "./data";

export default function Nav() {
  const count = useAtomValue(cart.countAtom);
  return (
    <TplBottomNav
      tabs={[
        { key: "home", label: "Trang chủ", icon: "zi-home", to: path("") },
        { key: "menu", label: "Thực đơn", icon: "zi-list-1", to: path("/menu") },
        { key: "cart", label: "Đơn hàng", icon: "zi-inbox", to: path("/cart"), badge: count },
        { key: "account", label: "Tài khoản", icon: "zi-user", to: path("/account") },
      ]}
    />
  );
}
