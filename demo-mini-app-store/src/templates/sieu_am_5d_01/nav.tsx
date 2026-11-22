import { useAtomValue } from "jotai";

import { TplBottomNav } from "../_shared/kit";
import { appointmentsAtom, path } from "./data";

export default function Nav() {
  const upcoming = useAtomValue(appointmentsAtom).filter((a) => a.status === "upcoming").length;
  return (
    <TplBottomNav
      tabs={[
        { key: "home", label: "Trang chủ", icon: "zi-home", to: path("") },
        { key: "packages", label: "Mốc khám & 5D", icon: "zi-note", to: path("/packages") },
        { key: "appointments", label: "Lịch & Ảnh 5D", icon: "zi-calendar", to: path("/appointments"), badge: upcoming },
        { key: "account", label: "Mẹ & Bé", icon: "zi-user", to: path("/account") },
      ]}
    />
  );
}
