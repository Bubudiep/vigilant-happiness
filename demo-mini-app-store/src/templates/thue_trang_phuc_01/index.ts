import { lazy } from "react";

import type { TemplateMeta } from "../types";
import Nav from "./nav";

/** T14 · Cho thuê trang phục (Xiêm Y Studio) */
const meta: TemplateMeta = {
  id: "thue_trang_phuc_01",
  code: "T14",
  name: "Cho thuê trang phục",
  brand: "Xiêm Y Studio",
  description: "Áo dài, cổ phục, váy cưới, cosplay – chọn size, ngày thuê, số ngày, tính cọc, lịch trả đồ.",
  categories: ["fashion"],
  color: "#9a3412",
  theme: { primary: "#9a3412", accent: "#be123c", bg: "#fbf7f2" },
  features: ["Thuê theo ngày", "Tính cọc", "Lịch thuê"],
  status: "live",
  routes: [
    { path: "", component: lazy(() => import("./pages/home")) },
    { path: "/catalog", component: lazy(() => import("./pages/catalog")) },
    { path: "/item/:id", component: lazy(() => import("./pages/item")) },
    { path: "/rentals", component: lazy(() => import("./pages/rentals")) },
    { path: "/account", component: lazy(() => import("./pages/account")) },
  ],
  navigation: Nav,
};

export default meta;
