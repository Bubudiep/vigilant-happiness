import { lazy } from "react";

import type { TemplateMeta } from "../types";
import Nav from "./nav";

/** T17 · Văn phòng Công chứng (VPCC Tâm Đức) */
const meta: TemplateMeta = {
  id: "cong_chung_01",
  code: "T17",
  name: "Văn phòng Công chứng",
  brand: "VPCC Tâm Đức",
  description: "Checklist giấy tờ cần chuẩn bị, tính phí công chứng tự động, gửi ảnh hồ sơ soạn trước & đặt lịch ký tận nơi.",
  categories: ["legal", "real_estate", "gov"],
  color: "#1e3a8a",
  theme: { primary: "#1e3a8a", accent: "#b45309", bg: "#f4f6fa" },
  features: ["Checklist giấy tờ", "Tính phí tự động", "Đặt lịch ký tận nơi"],
  status: "live",
  featured: true,
  routes: [
    { path: "", component: lazy(() => import("./pages/home")) },
    { path: "/services", component: lazy(() => import("./pages/services")) },
    { path: "/service/:id", component: lazy(() => import("./pages/service")) },
    { path: "/bookings", component: lazy(() => import("./pages/bookings")) },
    { path: "/account", component: lazy(() => import("./pages/account")) },
  ],
  navigation: Nav,
};

export default meta;
