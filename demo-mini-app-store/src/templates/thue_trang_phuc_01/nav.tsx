import { useAtomValue } from "jotai";

import { TplBottomNav } from "../_shared/kit";
import { path, rentalsAtom } from "./data";

export default function Nav() {
  const upcoming = useAtomValue(rentalsAtom).filter((r) => r.status === "upcoming").length;
  return (
    <TplBottomNav
      tabs={[
        { key: "home", label: "Trang chủ", icon: "zi-home", to: path("") },
        { key: "catalog", label: "Trang phục", icon: "zi-more-grid", to: path("/catalog") },
        { key: "rentals", label: "Lịch thuê", icon: "zi-calendar", to: path("/rentals"), badge: upcoming },
        { key: "account", label: "Tài khoản", icon: "zi-user", to: path("/account") },
      ]}
    />
  );
}
