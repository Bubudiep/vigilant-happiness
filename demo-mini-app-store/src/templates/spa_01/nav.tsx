import { useAtomValue } from "jotai";

import { TplBottomNav } from "../_shared/kit";
import { bookingsAtom, path } from "./data";

export default function Nav() {
  const upcoming = useAtomValue(bookingsAtom).filter((b) => b.status === "upcoming").length;
  return (
    <TplBottomNav
      tabs={[
        { key: "home", label: "Trang chủ", icon: "zi-home", to: path("") },
        { key: "services", label: "Dịch vụ", icon: "zi-list-1", to: path("/services") },
        { key: "bookings", label: "Lịch hẹn", icon: "zi-calendar", to: path("/bookings"), badge: upcoming },
        { key: "account", label: "Tài khoản", icon: "zi-user", to: path("/account") },
      ]}
    />
  );
}
