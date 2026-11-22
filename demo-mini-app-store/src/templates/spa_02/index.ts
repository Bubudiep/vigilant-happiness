import { lazy } from "react";

import type { TemplateMeta } from "../types";
import Nav from "./nav";

/** T23 · Spa dưỡng sinh & liệu trình (An Nhiên Spa) */
const meta: TemplateMeta = {
  id: "spa_02",
  code: "T23",
  name: "Spa dưỡng sinh & Liệu trình",
  brand: "An Nhiên Spa",
  description: "Massage, gội dưỡng sinh, chăm sóc da; bán gói liệu trình nhiều buổi, theo dõi số buổi còn lại, đặt lịch chọn phòng & kỹ thuật viên.",
  categories: ["spa"],
  color: "#0f766e",
  theme: { primary: "#0f766e", accent: "#d4a373", bg: "#f4f7f5" },
  features: ["Gói liệu trình", "Đặt lịch chọn phòng", "Ví trả trước"],
  status: "live",
  featured: true,
  routes: [
    { path: "", component: lazy(() => import("./pages/home")) },
    { path: "/services", component: lazy(() => import("./pages/services")) },
    { path: "/packages", component: lazy(() => import("./pages/packages")) },
    { path: "/book/:id", component: lazy(() => import("./pages/book")) },
    { path: "/bookings", component: lazy(() => import("./pages/bookings")) },
    { path: "/account", component: lazy(() => import("./pages/account")) },
  ],
  navigation: Nav,
};

export default meta;
