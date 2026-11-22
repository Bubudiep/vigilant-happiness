import { lazy } from "react";

import type { TemplateMeta } from "../types";
import Nav from "./nav";

/** T18 · Văn phòng Luật sư (Công ty Luật Minh Chính & Cộng sự) */
const meta: TemplateMeta = {
  id: "van_phong_luat_01",
  code: "T18",
  name: "Văn phòng Luật sư",
  brand: "Luật Minh Chính",
  description: "Đặt lịch tư vấn Luật sư qua Video/Zalo hoặc trực tiếp, soạn thảo đơn từ, rà soát hợp đồng & theo dõi tiến độ vụ việc.",
  categories: ["legal"],
  color: "#1c1917",
  theme: { primary: "#1c1917", accent: "#b45309", bg: "#f6f5f2" },
  features: ["Đặt lịch Luật sư", "Soạn đơn & hợp đồng", "Theo dõi vụ việc"],
  status: "live",
  featured: true,
  routes: [
    { path: "", component: lazy(() => import("./pages/home")) },
    { path: "/lawyers", component: lazy(() => import("./pages/lawyers")) },
    { path: "/book/:id", component: lazy(() => import("./pages/book")) },
    { path: "/cases", component: lazy(() => import("./pages/cases")) },
    { path: "/account", component: lazy(() => import("./pages/account")) },
  ],
  navigation: Nav,
};

export default meta;
