import { lazy } from "react";

import type { TemplateMeta } from "../types";
import Nav from "./nav";

/** T22 · Tiệm Nail (Mây Nail Studio) */
const meta: TemplateMeta = {
  id: "nail_01",
  code: "T22",
  name: "Tiệm Nail",
  brand: "Mây Nail Studio",
  description: "Bảng giá sơn gel, vẽ, đắp móng, chăm sóc da tay chân; chọn mẫu & màu sơn, chọn thợ, đặt lịch theo giờ.",
  categories: ["spa"],
  color: "#db2777",
  theme: { primary: "#db2777", accent: "#f9a8d4", bg: "#fdf4f8" },
  features: ["Chọn mẫu & màu", "Đặt lịch chọn thợ", "Thẻ tích điểm"],
  status: "live",
  featured: true,
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
