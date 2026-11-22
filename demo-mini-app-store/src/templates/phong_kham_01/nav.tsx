import { useAtomValue } from "jotai";

import { TplBottomNav } from "../_shared/kit";
import { appointmentsAtom, path } from "./data";

export default function Nav() {
  const upcoming = useAtomValue(appointmentsAtom).filter((a) => a.status === "upcoming").length;
  return (
    <TplBottomNav
      tabs={[
        { key: "home", label: "Trang chủ", icon: "zi-home", to: path("") },
        { key: "doctors", label: "Bác sĩ", icon: "zi-members", to: path("/doctors") },
        { key: "appointments", label: "Lịch khám", icon: "zi-calendar", to: path("/appointments"), badge: upcoming },
        { key: "account", label: "Hồ sơ", icon: "zi-user", to: path("/account") },
      ]}
    />
  );
}
