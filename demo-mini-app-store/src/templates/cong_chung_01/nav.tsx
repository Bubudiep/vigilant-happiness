import { useAtomValue } from "jotai";

import { TplBottomNav } from "../_shared/kit";
import { bookingsAtom, path } from "./data";

export default function Nav() {
  const upcoming = useAtomValue(bookingsAtom).filter((b) => b.status === "upcoming").length;
  return (
    <TplBottomNav
      tabs={[
        { key: "home", label: "Trang chủ", icon: "zi-home", to: path("") },
        { key: "services", label: "Thủ tục & Phí", icon: "zi-note", to: path("/services") },
        { key: "bookings", label: "Lịch hẹn ký", icon: "zi-calendar", to: path("/bookings"), badge: upcoming },
        { key: "account", label: "Hồ sơ", icon: "zi-user", to: path("/account") },
      ]}
    />
  );
}
