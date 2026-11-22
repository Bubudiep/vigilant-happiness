import { ReactNode } from "react";
import { Page } from "zmp-ui";

import { theme } from "../constants";
import type { ShopTab } from "./bottom-nav";

import { NAV_HEIGHT } from "@/templates/_shared/kit/theme";

/** Chiều cao thanh tab — xem kit/theme.ts */
export const BOTTOM_NAV_HEIGHT = NAV_HEIGHT;

/**
 * Khung trang của mẫu: nền + chừa chỗ ở đáy.
 * `tab` chỉ để chừa chỗ cho thanh tab; thanh tab được render ở BottomNav (ngoài AnimationRoutes).
 */
export default function ShopPage({
  tab,
  children,
  bottomSpace = 0,
}: {
  tab?: ShopTab;
  children: ReactNode;
  /** Khoảng trống thêm ở đáy (VD: thanh "Thêm vào giỏ") */
  bottomSpace?: number;
}) {
  const padding = (tab ? BOTTOM_NAV_HEIGHT + 16 : 16) + bottomSpace;
  return (
    <Page className="tpl-thoi-trang-01 text-gray-900" style={{ background: theme.bg }}>
      <div style={{ paddingBottom: `calc(${padding}px + var(--zaui-safe-area-inset-bottom, 0px))` }}>
        {children}
      </div>
    </Page>
  );
}
