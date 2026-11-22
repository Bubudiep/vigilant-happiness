import { useAtomValue } from "jotai";

import { TplBottomNav } from "../_shared/kit";
import { order, path } from "./data";

export default function Nav() {
  const count = useAtomValue(order.countAtom);
  return (
    <TplBottomNav
      tabs={[
        { key: "home", label: "Trang chủ", icon: "zi-home", to: path("") },
        { key: "machines", label: "Đặt máy", icon: "zi-grid-solid", to: path("/machines") },
        { key: "menu", label: "Gọi đồ", icon: "zi-list-1", to: path("/menu"), badge: count },
        { key: "account", label: "Tài khoản", icon: "zi-user", to: path("/account") },
      ]}
    />
  );
}
