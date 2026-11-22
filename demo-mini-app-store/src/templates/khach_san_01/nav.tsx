import { useAtomValue } from "jotai";

import { TplBottomNav } from "../_shared/kit";
import { myBookingsAtom, path } from "./data";

export default function Nav() {
  const count = useAtomValue(myBookingsAtom).filter((b) => b.status === "upcoming").length;
  return (
    <TplBottomNav
      tabs={[
        { key: "home", label: "Trang chủ", icon: "zi-home", to: path("") },
        { key: "rooms", label: "Phòng", icon: "zi-more-grid", to: path("/rooms") },
        { key: "bookings", label: "Đặt phòng", icon: "zi-calendar", to: path("/bookings"), badge: count },
        { key: "account", label: "Tài khoản", icon: "zi-user", to: path("/account") },
      ]}
    />
  );
}
