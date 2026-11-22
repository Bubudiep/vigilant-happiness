import { lazy } from "react";

import type { TemplateMeta } from "../types";
import Nav from "./nav";

/** T20 · Kem & Trà sữa (Mixue) – mẫu demo đề xuất riêng cho Mixue */
const meta: TemplateMeta = {
  id: "mixue_01",
  code: "T20",
  name: "Kem & Trà sữa",
  brand: "Mixue",
  description: "Mẫu đề xuất cho chuỗi kem & trà sữa: menu kem, trà sữa, trà chanh; tuỳ chọn size / đường / đá / topping; đặt giao hoặc tự đến lấy; tích điểm thành viên.",
  categories: ["fnb"],
  color: "#e60012",
  theme: { primary: "#e60012", accent: "#ff8a00", bg: "#fff5f5" },
  features: ["Menu kem & trà", "Topping", "Tích điểm"],
  status: "live",
  featured: true,
  routes: [
    { path: "", component: lazy(() => import("./pages/home")) },
    { path: "/menu", component: lazy(() => import("./pages/menu")) },
    { path: "/item/:id", component: lazy(() => import("./pages/item")) },
    { path: "/cart", component: lazy(() => import("./pages/cart")) },
    { path: "/account", component: lazy(() => import("./pages/account")) },
  ],
  navigation: Nav,
};

export default meta;
