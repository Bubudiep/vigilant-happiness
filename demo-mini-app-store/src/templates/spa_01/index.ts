import { lazy } from "react";

import type { TemplateMeta } from "../types";
import Nav from "./nav";

/** T03 · Spa / Salon (Lotus Spa) */
const meta: TemplateMeta = {
  id: "spa_01",
  code: "T03",
  name: "Spa / Salon",
  brand: "Lotus Spa",
  description: "Danh sách dịch vụ, đặt lịch theo ngày giờ, chọn kỹ thuật viên, quản lý lịch hẹn.",
  categories: ["spa"],
  color: "#b5476f",
  theme: { primary: "#b5476f", accent: "#d98aa5", bg: "#fbf5f7" },
  features: ["Dịch vụ", "Đặt lịch", "Thẻ thành viên"],
  status: "live",
  routes: [
    { path: "", component: lazy(() => import("./pages/home")) },
    { path: "/services", component: lazy(() => import("./pages/services")) },
    { path: "/book/:id", component: lazy(() => import("./pages/book")) },
    { path: "/bookings", component: lazy(() => import("./pages/bookings")) },
    { path: "/account", component: lazy(() => import("./pages/account")) },
  ],
  navigation: Nav,
};

export default meta;
