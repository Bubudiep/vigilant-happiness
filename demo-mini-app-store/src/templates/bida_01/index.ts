import { lazy } from "react";

import type { TemplateMeta } from "../types";
import Nav from "./nav";

/** T15 · Quán bida (Cơ Thủ Billiards Club) */
const meta: TemplateMeta = {
  id: "bida_01",
  code: "T15",
  name: "Quán bida",
  brand: "Cơ Thủ Billiards",
  description: "Sơ đồ bàn trống theo thời gian thực, đặt bàn theo giờ, tính tiền giờ chơi, gọi đồ lên bàn.",
  categories: ["entertainment", "fnb"],
  color: "#065f46",
  theme: { primary: "#0b6e4f", accent: "#eab308", bg: "#f2f5f3" },
  features: ["Sơ đồ bàn", "Đặt bàn", "Gọi đồ lên bàn"],
  status: "live",
  routes: [
    { path: "", component: lazy(() => import("./pages/home")) },
    { path: "/tables", component: lazy(() => import("./pages/tables")) },
    { path: "/menu", component: lazy(() => import("./pages/menu")) },
    { path: "/order", component: lazy(() => import("./pages/order")) },
    { path: "/account", component: lazy(() => import("./pages/account")) },
  ],
  navigation: Nav,
};

export default meta;
