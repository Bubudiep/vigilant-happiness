import { useAtomValue } from "jotai";

import { TplBottomNav } from "../_shared/kit";
import { notices, path, readNoticesAtom } from "./data";

export default function Nav() {
  const read = useAtomValue(readNoticesAtom);
  const unread = notices.filter((n) => !read.includes(n.id)).length;
  return (
    <TplBottomNav
      tabs={[
        { key: "home", label: "Trang chủ", icon: "zi-home", to: path("") },
        { key: "notices", label: "Thông báo", icon: "zi-notif", to: path("/notices"), badge: unread },
        { key: "timetable", label: "TKB", icon: "zi-calendar", to: path("/timetable") },
        { key: "account", label: "Phụ huynh", icon: "zi-user", to: path("/account") },
      ]}
    />
  );
}
