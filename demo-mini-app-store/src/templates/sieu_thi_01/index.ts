import { lazy } from "react";

import type { TemplateMeta } from "../types";
import Nav from "./nav";

/** T05 · Siêu thị mini (Xanh Mart) */
const meta: TemplateMeta = {
  id: "sieu_thi_01",
  code: "T05",
  name: "Siêu thị mini",
  brand: "Xanh Mart",
  description: "Danh mục ngành hàng, giá sốc mỗi ngày, thêm nhanh vào giỏ, giao trong 2 giờ.",
  categories: ["supermarket", "retail"],
  color: "#16a34a",
  theme: { primary: "#16a34a", accent: "#f59e0b", bg: "#f3f7f4" },
  features: ["Danh mục", "Giá sốc", "Giao 2h"],
  status: "live",
  routes: [
    { path: "", component: lazy(() => import("./pages/home")) },
    { path: "/category", component: lazy(() => import("./pages/category")) },
    { path: "/cart", component: lazy(() => import("./pages/cart")) },
    { path: "/account", component: lazy(() => import("./pages/account")) },
  ],
  navigation: Nav,
};

export default meta;
