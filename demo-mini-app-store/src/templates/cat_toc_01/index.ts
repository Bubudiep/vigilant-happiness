import { lazy } from "react";

import type { TemplateMeta } from "../types";
import Nav from "./nav";

/** T21 · Tiệm cắt tóc nam (Gentle Barber) */
const meta: TemplateMeta = {
  id: "cat_toc_01",
  code: "T21",
  name: "Tiệm cắt tóc / Barber",
  brand: "Gentle Barber",
  description: "Bảng giá cắt – cạo – uốn – nhuộm, chọn thợ, đặt lịch theo giờ, lấy số xếp hàng & xem hàng chờ trực tiếp.",
  categories: ["spa"],
  color: "#1f2937",
  theme: { primary: "#1f2937", accent: "#c08a3e", bg: "#f5f4f1" },
  features: ["Đặt lịch chọn thợ", "Lấy số xếp hàng", "Kiểu tóc"],
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
