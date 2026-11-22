import { useAtomValue } from "jotai";

import { TplBottomNav } from "../_shared/kit";
import { consultationsAtom, path } from "./data";

export default function Nav() {
  const upcoming = useAtomValue(consultationsAtom).filter((c) => c.status === "upcoming").length;
  return (
    <TplBottomNav
      tabs={[
        { key: "home", label: "Trang chủ", icon: "zi-home", to: path("") },
        { key: "lawyers", label: "Luật sư", icon: "zi-user-circle", to: path("/lawyers") },
        { key: "cases", label: "Hồ sơ & Lịch", icon: "zi-note", to: path("/cases"), badge: upcoming },
        { key: "account", label: "Tài khoản", icon: "zi-user", to: path("/account") },
      ]}
    />
  );
}
