import { lazy } from "react";

import type { TemplateMeta } from "../types";
import Nav from "./nav";

/** T09 · Khách sạn (Sea Breeze Hotel) */
const meta: TemplateMeta = {
  id: "khach_san_01",
  code: "T09",
  name: "Khách sạn",
  brand: "Sea Breeze Hotel",
  description: "Tìm phòng theo ngày & số khách, chi tiết hạng phòng, tiện ích, đặt phòng trực tiếp.",
  categories: ["hotel"],
  color: "#0f766e",
  theme: { primary: "#0f766e", accent: "#f4a261", bg: "#f3f8f7" },
  features: ["Đặt phòng", "Hạng phòng", "Tiện ích"],
  status: "live",
  routes: [
    { path: "", component: lazy(() => import("./pages/home")) },
    { path: "/rooms", component: lazy(() => import("./pages/rooms")) },
    { path: "/room/:id", component: lazy(() => import("./pages/room")) },
    { path: "/bookings", component: lazy(() => import("./pages/bookings")) },
    { path: "/account", component: lazy(() => import("./pages/account")) },
  ],
  navigation: Nav,
};

export default meta;
