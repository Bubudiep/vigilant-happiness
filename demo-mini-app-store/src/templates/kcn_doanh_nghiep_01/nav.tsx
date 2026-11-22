import { useAtomValue } from "jotai";

import { TplBottomNav } from "../_shared/kit";
import { formRequestsAtom, path } from "./data";

export default function Nav() {
  const pending = useAtomValue(formRequestsAtom).filter((f) => f.status === "pending").length;
  return (
    <TplBottomNav
      centerChat={false}
      tabs={[
        { key: "home", label: "Tổng quan", icon: "zi-home", to: path("") },
        { key: "timesheet", label: "Bảng công", icon: "zi-calendar", to: path("/timesheet") },
        { key: "forms", label: "Đơn & Giấy tờ", icon: "zi-note", to: path("/forms"), badge: pending },
        { key: "mailbox", label: "Hỏi đáp", icon: "zi-chat", to: path("/mailbox") },
        { key: "account", label: "Cá nhân", icon: "zi-user", to: path("/account") },
      ]}
    />
  );
}
