import { TplBottomNav } from "../_shared/kit";
import { path } from "./data";

export default function Nav() {
  return (
    <TplBottomNav
      tabs={[
        { key: "home", label: "Trang chủ", icon: "zi-home", to: path("") },
        { key: "news", label: "Tin tức", icon: "zi-post", to: path("/news") },
        { key: "procedures", label: "Thủ tục", icon: "zi-file", to: path("/procedures") },
        { key: "feedback", label: "Phản ánh", icon: "zi-chat", to: path("/feedback") },
      ]}
    />
  );
}
