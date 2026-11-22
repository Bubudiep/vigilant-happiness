import { lazy } from "react";

import type { TemplateMeta } from "../types";
import Nav from "./nav";

/** T12 · Tiệm quà tặng (Hộp Quà Xinh) */
const meta: TemplateMeta = {
  id: "qua_tang_01",
  code: "T12",
  name: "Tiệm quà tặng",
  brand: "Hộp Quà Xinh",
  description: "Chọn quà theo dịp và người nhận, gói quà, viết thiệp, giao tận tay bất ngờ.",
  categories: ["retail"],
  color: "#e11d48",
  theme: { primary: "#e11d48", accent: "#f59e0b", bg: "#fff7f5" },
  features: ["Quà theo dịp", "Gói quà", "Viết thiệp"],
  status: "live",
  routes: [
    { path: "", component: lazy(() => import("./pages/home")) },
    { path: "/shop", component: lazy(() => import("./pages/shop")) },
    { path: "/cart", component: lazy(() => import("./pages/cart")) },
    { path: "/account", component: lazy(() => import("./pages/account")) },
  ],
  navigation: Nav,
};

export default meta;
