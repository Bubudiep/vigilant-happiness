import { lazy } from "react";

import type { TemplateMeta } from "../types";
import Nav from "./nav";

/** T11 · UBND / Sở ban ngành (UBND Phường Hoà Bình – tên giả lập) */
const meta: TemplateMeta = {
  id: "co_quan_01",
  code: "T11",
  name: "UBND / Sở ban ngành",
  brand: "UBND Phường Hoà Bình",
  description: "Cổng dịch vụ công: tin tức, hướng dẫn thủ tục hành chính, phản ánh hiện trường.",
  categories: ["gov"],
  color: "#b91c1c",
  theme: { primary: "#b91c1c", accent: "#f59e0b", bg: "#f6f6f6" },
  features: ["Thủ tục", "Phản ánh", "Tin tức"],
  status: "live",
  routes: [
    { path: "", component: lazy(() => import("./pages/home")) },
    { path: "/news", component: lazy(() => import("./pages/news")) },
    { path: "/procedures", component: lazy(() => import("./pages/procedures")) },
    { path: "/procedure/:id", component: lazy(() => import("./pages/procedure")) },
    { path: "/feedback", component: lazy(() => import("./pages/feedback")) },
  ],
  navigation: Nav,
};

export default meta;
