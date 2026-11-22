import { lazy } from "react";

import type { TemplateMeta } from "../types";
import Nav from "./nav";

/** T19 · Doanh nghiệp & Nhà máy KCN (VinaTech Industrial) */
const meta: TemplateMeta = {
  id: "kcn_doanh_nghiep_01",
  code: "T19",
  name: "Doanh nghiệp & Nhà máy KCN",
  brand: "VinaTech Industrial",
  description: "Chấm công & bảng công, nộp ảnh giấy tờ HR, đơn từ & báo cáo hiện trường, hòm thư góp ý ẩn danh và hỏi đáp nhân sự.",
  categories: ["enterprise"],
  color: "#0f766e",
  theme: { primary: "#0f766e", accent: "#0284c7", bg: "#f4f6f8" },
  features: ["Check bảng công", "Nộp ảnh giấy tờ", "Đơn từ & Báo cáo", "Hòm thư & Hỏi đáp"],
  status: "live",
  featured: true,
  routes: [
    { path: "", component: lazy(() => import("./pages/home")) },
    { path: "/timesheet", component: lazy(() => import("./pages/timesheet")) },
    { path: "/forms", component: lazy(() => import("./pages/forms")) },
    { path: "/mailbox", component: lazy(() => import("./pages/mailbox")) },
    { path: "/account", component: lazy(() => import("./pages/account")) },
  ],
  navigation: Nav,
};

export default meta;
