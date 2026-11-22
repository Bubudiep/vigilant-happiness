import { lazy } from "react";

import type { TemplateMeta } from "../types";
import Nav from "./nav";

/** T16 · Phòng khám Siêu âm 5D (Mẹ Tròn Con Vuông 5D Clinic) */
const meta: TemplateMeta = {
  id: "sieu_am_5d_01",
  code: "T16",
  name: "Phòng khám Siêu âm 5D",
  brand: "BabySee 5D Clinic",
  description: "Theo dõi tuần thai, đặt lịch siêu âm 5D HDLive, nhận ảnh & video clip bé yêu trực tiếp qua Zalo.",
  categories: ["health", "mom_baby"],
  color: "#db2777",
  theme: { primary: "#db2777", accent: "#0284c7", bg: "#fdf2f8" },
  features: ["Theo dõi tuần thai", "Đặt lịch siêu âm 5D", "Album ảnh & video bé"],
  status: "live",
  featured: true,
  routes: [
    { path: "", component: lazy(() => import("./pages/home")) },
    { path: "/packages", component: lazy(() => import("./pages/packages")) },
    { path: "/book/:id", component: lazy(() => import("./pages/book")) },
    { path: "/appointments", component: lazy(() => import("./pages/appointments")) },
    { path: "/account", component: lazy(() => import("./pages/account")) },
  ],
  navigation: Nav,
};

export default meta;
