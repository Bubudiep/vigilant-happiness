import { lazy } from "react";

import type { TemplateMeta } from "../types";
import Nav from "./nav";

/** T08 · Trường học (THCS Ánh Sao) */
const meta: TemplateMeta = {
  id: "truong_hoc_01",
  code: "T08",
  name: "Trường học",
  brand: "THCS Ánh Sao",
  description: "Kết nối nhà trường – phụ huynh: thông báo, thời khoá biểu, học phí, xin nghỉ học.",
  categories: ["education"],
  color: "#4f46e5",
  theme: { primary: "#4f46e5", accent: "#f59e0b", bg: "#f4f5fb" },
  features: ["Thông báo", "Thời khoá biểu", "Học phí"],
  status: "live",
  routes: [
    { path: "", component: lazy(() => import("./pages/home")) },
    { path: "/notices", component: lazy(() => import("./pages/notices")) },
    { path: "/timetable", component: lazy(() => import("./pages/timetable")) },
    { path: "/fees", component: lazy(() => import("./pages/fees")) },
    { path: "/leave", component: lazy(() => import("./pages/leave")) },
    { path: "/account", component: lazy(() => import("./pages/account")) },
  ],
  navigation: Nav,
};

export default meta;
