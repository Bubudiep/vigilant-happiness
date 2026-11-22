import { useAtomValue } from "jotai";

import { TplBottomNav } from "../_shared/kit";
import { cart, path } from "./data";

export default function Nav() {
  const count = useAtomValue(cart.countAtom);
  return (
    <TplBottomNav
      tabs={[
        { key: "home", label: "Trang chủ", icon: "zi-home", to: path("") },
        { key: "shop", label: "Quà tặng", icon: "zi-more-grid", to: path("/shop") },
        { key: "cart", label: "Giỏ quà", icon: "zi-inbox", to: path("/cart"), badge: count },
        { key: "account", label: "Tài khoản", icon: "zi-user", to: path("/account") },
      ]}
    />
  );
}
