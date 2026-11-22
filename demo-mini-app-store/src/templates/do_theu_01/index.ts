import { lazy } from "react";

import type { TemplateMeta } from "../types";
import Nav from "./nav";

/** T13 · Order đồ thêu (Thêu Xinh Atelier) */
const meta: TemplateMeta = {
  id: "do_theu_01",
  code: "T13",
  name: "Order đồ thêu",
  brand: "Thêu Xinh Atelier",
  description: "Chọn phôi, nhập chữ, chọn màu chỉ, font, hoạ tiết – xem trước trực tiếp, theo dõi tiến độ thêu.",
  categories: ["retail", "fashion"],
  color: "#2a9d8f",
  theme: { primary: "#2a7d73", accent: "#e76f51", bg: "#f7f5f0" },
  features: ["Thêu theo yêu cầu", "Xem trước", "Tiến độ đơn"],
  status: "live",
  routes: [
    { path: "", component: lazy(() => import("./pages/home")) },
    { path: "/products", component: lazy(() => import("./pages/products")) },
    { path: "/custom/:id", component: lazy(() => import("./pages/custom")) },
    { path: "/orders", component: lazy(() => import("./pages/orders")) },
    { path: "/account", component: lazy(() => import("./pages/account")) },
  ],
  navigation: Nav,
};

export default meta;
