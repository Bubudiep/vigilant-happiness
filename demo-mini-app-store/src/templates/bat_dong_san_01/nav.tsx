import { useAtomValue } from "jotai";

import { TplBottomNav } from "../_shared/kit";
import { path, savedAtom } from "./data";

export default function Nav() {
  const saved = useAtomValue(savedAtom).length;
  return (
    <TplBottomNav
      tabs={[
        { key: "home", label: "Trang chủ", icon: "zi-home", to: path("") },
        { key: "projects", label: "Dự án", icon: "zi-more-grid", to: path("/projects") },
        { key: "saved", label: "Đã lưu", icon: "zi-heart", to: path("/saved"), badge: saved },
        { key: "account", label: "Tài khoản", icon: "zi-user", to: path("/account") },
      ]}
    />
  );
}
