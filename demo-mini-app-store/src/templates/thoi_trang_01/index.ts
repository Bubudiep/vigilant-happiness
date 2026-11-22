import { lazy } from "react";

import type { TemplateMeta } from "../types";
import BottomNav from "./components/bottom-nav";

/**
 * T01 · Shop thời trang (LUMI Fashion)
 * Link mở thẳng: ?mode=Template&templateID=thoi_trang_01
 */
const meta: TemplateMeta = {
  id: "thoi_trang_01",
  code: "T01",
  name: "Shop thời trang",
  brand: "LUMI Fashion",
  description: "Cửa hàng thời trang: danh mục, chi tiết sản phẩm chọn màu/size, giỏ hàng, thành viên.",
  categories: ["fashion", "retail"],
  color: "#1f1f1f",
  theme: { primary: "#1f1f1f", accent: "#c8a27a", bg: "#f7f5f2" },
  features: ["Flash sale", "Chọn màu / size", "Giỏ hàng", "Thành viên"],
  status: "live",
  featured: true,
  routes: [
    { path: "", component: lazy(() => import("./pages/home")) },
    { path: "/category", component: lazy(() => import("./pages/category")) },
    { path: "/product/:productId", component: lazy(() => import("./pages/product")) },
    { path: "/cart", component: lazy(() => import("./pages/cart")) },
    { path: "/account", component: lazy(() => import("./pages/account")) },
  ],
  navigation: BottomNav,
};

export default meta;
