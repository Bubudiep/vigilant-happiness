import { lazy } from "react";

import type { TemplateMeta } from "../types";
import Nav from "./nav";

/** T04 · Nhà hàng (Bếp Quê Nhà) */
const meta: TemplateMeta = {
  id: "fnb_nha_hang_01",
  code: "T04",
  name: "Nhà hàng",
  brand: "Bếp Quê Nhà",
  description: "Thực đơn món ăn, gọi món trước, đặt bàn theo ngày giờ và khu vực.",
  categories: ["fnb"],
  color: "#b23a1d",
  theme: { primary: "#b23a1d", accent: "#e8a33d", bg: "#fbf6f0" },
  features: ["Thực đơn", "Gọi món", "Đặt bàn"],
  status: "live",
  routes: [
    { path: "", component: lazy(() => import("./pages/home")) },
    { path: "/menu", component: lazy(() => import("./pages/menu")) },
    { path: "/order", component: lazy(() => import("./pages/order")) },
    { path: "/reserve", component: lazy(() => import("./pages/reserve")) },
    { path: "/account", component: lazy(() => import("./pages/account")) },
  ],
  navigation: Nav,
};

export default meta;
