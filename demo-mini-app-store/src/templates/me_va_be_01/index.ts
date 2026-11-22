import { lazy } from "react";

import type { TemplateMeta } from "../types";
import Nav from "./nav";

/** T06 · Shop mẹ & bé (Bé Yêu Shop) */
const meta: TemplateMeta = {
  id: "me_va_be_01",
  code: "T06",
  name: "Shop mẹ & bé",
  brand: "Bé Yêu Shop",
  description: "Sản phẩm theo độ tuổi của bé, cẩm nang cho mẹ, hồ sơ bé và tích điểm.",
  categories: ["mom_baby", "retail"],
  color: "#f06292",
  theme: { primary: "#e8507f", accent: "#ffa94d", bg: "#fff6f8" },
  features: ["Theo độ tuổi", "Cẩm nang", "Tích điểm"],
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
