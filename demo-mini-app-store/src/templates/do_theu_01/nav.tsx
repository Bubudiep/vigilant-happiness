import { useAtomValue } from "jotai";

import { TplBottomNav } from "../_shared/kit";
import { orderSteps, ordersAtom, path } from "./data";

export default function Nav() {
  const active = useAtomValue(ordersAtom).filter((o) => o.step < orderSteps.length).length;
  return (
    <TplBottomNav
      tabs={[
        { key: "home", label: "Trang chủ", icon: "zi-home", to: path("") },
        { key: "products", label: "Mẫu thêu", icon: "zi-more-grid", to: path("/products") },
        { key: "orders", label: "Đơn thêu", icon: "zi-note", to: path("/orders"), badge: active },
        { key: "account", label: "Tài khoản", icon: "zi-user", to: path("/account") },
      ]}
    />
  );
}
