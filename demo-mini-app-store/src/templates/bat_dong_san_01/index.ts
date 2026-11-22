import { lazy } from "react";

import type { TemplateMeta } from "../types";
import Nav from "./nav";

/** T10 · Bất động sản (An Cư Land) */
const meta: TemplateMeta = {
  id: "bat_dong_san_01",
  code: "T10",
  name: "Bất động sản",
  brand: "An Cư Land",
  description: "Danh sách dự án, chi tiết pháp lý & loại căn, lưu dự án, đăng ký xem nhà mẫu.",
  categories: ["real_estate"],
  color: "#1e3a5f",
  theme: { primary: "#1e3a5f", accent: "#c9a227", bg: "#f4f6f9" },
  features: ["Dự án", "Loại căn", "Đăng ký xem nhà"],
  status: "live",
  routes: [
    { path: "", component: lazy(() => import("./pages/home")) },
    { path: "/projects", component: lazy(() => import("./pages/projects")) },
    { path: "/project/:id", component: lazy(() => import("./pages/project")) },
    { path: "/saved", component: lazy(() => import("./pages/saved")) },
    { path: "/account", component: lazy(() => import("./pages/account")) },
  ],
  navigation: Nav,
};

export default meta;
