import { createContext, useContext } from "react";

/** Màu của một mẫu. Khai báo ở `meta.theme`, các component trong kit tự đọc qua context. */
export interface TemplateTheme {
  /** ID mẫu hiện tại, dùng để ánh xạ ảnh đúng ngành nghề */
  templateId?: string;
  /** Tên / mã / thương hiệu của mẫu — dùng cho thẻ chia sẻ, mời bạn bè */
  templateName?: string;
  templateCode?: string;
  brand?: string;
  /** Màu chính: nút, tab đang chọn, tiêu đề thương hiệu */
  primary: string;
  /** Màu nhấn: huy hiệu, thẻ thành viên */
  accent: string;
  /** Nền trang */
  bg: string;
}

export const defaultTheme: TemplateTheme = {
  primary: "#2f6bff",
  accent: "#ff7a1a",
  bg: "#f5f6f8",
};

export const TemplateThemeContext = createContext<TemplateTheme>(defaultTheme);

export function useTplTheme(): TemplateTheme {
  return useContext(TemplateThemeContext);
}

/** Chiều cao thanh tab (48px ZaUI + 4px padding-top), chưa tính safe area. Khớp với .tpl-bottom-nav trong app.scss */
export const NAV_HEIGHT = 60;

/** `calc(<px> + safe-area-bottom)` */
export function aboveSafeBottom(px: number): string {
  return `calc(${px}px + var(--zaui-safe-area-inset-bottom, 0px))`;
}
