import { lazy } from "react";

import type { TemplateMeta } from "../types";
import Nav from "./nav";

/** T02 · Quán cà phê (Mộc Coffee) */
const meta: TemplateMeta = {
  id: "fnb_cafe_01",
  code: "T02",
  name: "Quán cà phê",
  brand: "Mộc Coffee",
  description: "Menu đồ uống, tuỳ chọn size / đường / đá / topping, đặt giao hoặc tại quán, tích điểm.",
  categories: ["fnb"],
  color: "#6b4226",
  theme: { primary: "#6b4226", accent: "#c98b4f", bg: "#f8f4ef" },
  features: ["Menu", "Topping", "Đặt món"],
  status: "live",
  routes: [
    { path: "", component: lazy(() => import("./pages/home")) },
    { path: "/menu", component: lazy(() => import("./pages/menu")) },
    { path: "/item/:id", component: lazy(() => import("./pages/item")) },
    { path: "/cart", component: lazy(() => import("./pages/cart")) },
    { path: "/account", component: lazy(() => import("./pages/account")) },
  ],
  navigation: Nav,
};

export default meta;
