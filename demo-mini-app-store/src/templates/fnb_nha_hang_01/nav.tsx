import { TplBottomNav } from "../_shared/kit";
import { path } from "./data";

export default function Nav() {
  return (
    <TplBottomNav
      tabs={[
        { key: "home", label: "Trang chủ", icon: "zi-home", to: path("") },
        { key: "menu", label: "Thực đơn", icon: "zi-list-1", to: path("/menu") },
        { key: "reserve", label: "Đặt bàn", icon: "zi-calendar", to: path("/reserve") },
        { key: "account", label: "Tài khoản", icon: "zi-user", to: path("/account") },
      ]}
    />
  );
}
