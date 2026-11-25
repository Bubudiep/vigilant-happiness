import { ConfigProvider, type ThemeConfig } from "antd";
import type { ReactNode } from "react";

/**
 * Cỡ chữ & kích thước control riêng cho trang quản trị (/admin, /controller).
 * Đi cùng thang chữ Tailwind trong index.css (html.admin-ui): 2xs 9 · xs 10 · sm 11 · base 12 · lg 14 · xl 16.
 * Muốn to / nhỏ lại: sửa ở đây và ở index.css.
 */
const ADMIN_THEME: ThemeConfig = {
  // Bảng màu Atlassian (Jira): chữ #172B4D, phụ #44546F, viền #DCDFE4, xanh chính #0C66E4 — bo góc gọn kiểu Figma
  token: {
    colorPrimary: "#0C66E4",
    colorInfo: "#0C66E4",
    colorLink: "#0C66E4",
    colorSuccess: "#22A06B",
    colorWarning: "#E56910",
    colorError: "#C9372C",
    colorText: "#172B4D",
    colorTextSecondary: "#44546F",
    colorTextTertiary: "#626F86",
    colorTextQuaternary: "#8590A2",
    colorBorder: "#D0D4DB",
    colorBorderSecondary: "#E6E8EC",
    colorSplit: "#E6E8EC",
    colorBgLayout: "#F7F8F9",
    colorFillAlter: "#F7F8F9",
    colorFillSecondary: "#F1F2F4",
    colorFillTertiary: "#F1F2F4",
    colorFillQuaternary: "#F7F8F9",
    borderRadius: 6,
    borderRadiusSM: 4,
    borderRadiusLG: 8,
    borderRadiusXS: 3,
    boxShadow: "0 8px 12px rgba(9,30,66,.15), 0 0 1px rgba(9,30,66,.31)",
    boxShadowSecondary: "0 8px 12px rgba(9,30,66,.15), 0 0 1px rgba(9,30,66,.31)",
    controlOutline: "rgba(12,102,228,.18)",
    controlOutlineWidth: 2,
    fontSize: 11,
    fontSizeSM: 10,
    fontSizeLG: 12,
    fontSizeHeading5: 13,
    fontSizeHeading4: 14,
    fontSizeHeading3: 16,
    controlHeight: 28,
    controlHeightSM: 22,
    controlHeightLG: 34,
    motionDurationMid: "0.15s",
  },
  components: {
    Button: { fontWeight: 500, primaryShadow: "none", defaultShadow: "none", dangerShadow: "none", defaultBorderColor: "#D0D4DB" },
    Table: {
      fontSize: 11,
      cellPaddingBlock: 6,
      cellPaddingInline: 10,
      cellPaddingBlockSM: 5,
      cellPaddingInlineSM: 8,
      headerBg: "#F7F8F9",
      headerColor: "#44546F",
      headerSplitColor: "transparent",
      rowHoverBg: "#F7F8F9",
      borderColor: "#E6E8EC",
    },
    Card: { paddingLG: 14 },
    Modal: { titleFontSize: 13 },
    Drawer: { fontSizeLG: 13 },
    Tag: { fontSizeSM: 10, defaultBg: "#F1F2F4", defaultColor: "#44546F" },
    Menu: { itemHeight: 32 },
    Tabs: { titleFontSize: 11, itemColor: "#44546F", horizontalItemGutter: 20, horizontalMargin: "0 0 12px 0" },
    Segmented: { trackBg: "#F1F2F4", itemColor: "#44546F", itemSelectedColor: "#172B4D" },
    Input: { activeShadow: "0 0 0 1px #0C66E4", hoverBorderColor: "#8590A2" },
    InputNumber: { activeShadow: "0 0 0 1px #0C66E4", hoverBorderColor: "#8590A2" },
    Select: { activeOutlineColor: "rgba(12,102,228,.18)", hoverBorderColor: "#8590A2", optionSelectedBg: "#E9F2FF" },
    DatePicker: { activeShadow: "0 0 0 1px #0C66E4", hoverBorderColor: "#8590A2" },
    Tooltip: { colorBgSpotlight: "#172B4D" },
    Badge: { textFontSize: 10 },
  },
};

export function AdminTheme({ children }: { children: ReactNode }) {
  return <ConfigProvider theme={ADMIN_THEME}>{children}</ConfigProvider>;
}
