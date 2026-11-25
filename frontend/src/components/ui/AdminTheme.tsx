import { ConfigProvider } from "antd";
import type { ReactNode } from "react";

/**
 * Cỡ chữ & kích thước control riêng cho trang quản trị (/admin, /controller).
 * Đi cùng thang chữ Tailwind trong index.css (html.admin-ui): 2xs 9 · xs 10 · sm 11 · base 12 · lg 14 · xl 16.
 * Muốn to / nhỏ lại: sửa ở đây và ở index.css.
 */
const ADMIN_THEME = {
  token: {
    fontSize: 11,
    fontSizeSM: 10,
    fontSizeLG: 12,
    fontSizeHeading5: 13,
    fontSizeHeading4: 14,
    fontSizeHeading3: 16,
    controlHeight: 28,
    controlHeightSM: 22,
    controlHeightLG: 34,
  },
  components: {
    Table: { fontSize: 11, cellPaddingBlock: 6, cellPaddingInline: 10, cellPaddingBlockSM: 5, cellPaddingInlineSM: 8 },
    Card: { paddingLG: 14 },
    Modal: { titleFontSize: 13 },
    Drawer: { fontSizeLG: 13 },
    Tag: { fontSizeSM: 10 },
    Menu: { itemHeight: 32 },
    Tabs: { titleFontSize: 11 },
  },
};

export function AdminTheme({ children }: { children: ReactNode }) {
  return <ConfigProvider theme={ADMIN_THEME}>{children}</ConfigProvider>;
}
