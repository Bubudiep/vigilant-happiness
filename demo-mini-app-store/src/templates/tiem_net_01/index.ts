import { lazy } from "react";

import type { TemplateMeta } from "../types";
import Nav from "./nav";

/** T24 · Tiệm net / Cyber game (Zone 9 Gaming) */
const meta: TemplateMeta = {
  id: "tiem_net_01",
  code: "T24",
  name: "Tiệm net / Cyber Game",
  brand: "Zone 9 Gaming",
  description: "Sơ đồ máy trống theo khu (thường, VIP, thi đấu), đặt máy theo giờ, nạp ví giờ chơi, gọi đồ ăn uống tới máy.",
  categories: ["entertainment"],
  color: "#7c3aed",
  theme: { primary: "#7c3aed", accent: "#22d3ee", bg: "#f3f1fa" },
  features: ["Sơ đồ máy", "Nạp giờ chơi", "Gọi đồ tới máy"],
  status: "live",
  featured: true,
  routes: [
    { path: "", component: lazy(() => import("./pages/home")) },
    { path: "/machines", component: lazy(() => import("./pages/machines")) },
    { path: "/menu", component: lazy(() => import("./pages/menu")) },
    { path: "/order", component: lazy(() => import("./pages/order")) },
    { path: "/account", component: lazy(() => import("./pages/account")) },
  ],
  navigation: Nav,
};

export default meta;
