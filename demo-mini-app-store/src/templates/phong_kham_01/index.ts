import { lazy } from "react";

import type { TemplateMeta } from "../types";
import Nav from "./nav";

/** T07 · Phòng khám (An Khang Clinic) */
const meta: TemplateMeta = {
  id: "phong_kham_01",
  code: "T07",
  name: "Phòng khám",
  brand: "An Khang Clinic",
  description: "Chuyên khoa, danh sách bác sĩ, đặt lịch khám theo khung giờ, theo dõi lịch hẹn.",
  categories: ["health"],
  color: "#0e7490",
  theme: { primary: "#0e7490", accent: "#14b8a6", bg: "#f2f8fa" },
  features: ["Bác sĩ", "Đặt lịch khám", "Hồ sơ"],
  status: "live",
  routes: [
    { path: "", component: lazy(() => import("./pages/home")) },
    { path: "/doctors", component: lazy(() => import("./pages/doctors")) },
    { path: "/book/:id", component: lazy(() => import("./pages/book")) },
    { path: "/appointments", component: lazy(() => import("./pages/appointments")) },
    { path: "/account", component: lazy(() => import("./pages/account")) },
  ],
  navigation: Nav,
};

export default meta;
