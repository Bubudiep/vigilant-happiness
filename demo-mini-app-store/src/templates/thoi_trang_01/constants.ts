import { templatePath } from "../paths";

export const TEMPLATE_ID = "thoi_trang_01";
export const BRAND = "LUMI";

/** Màu của mẫu — chỉ dùng trong thư mục này */
export const theme = {
  primary: "#1f1f1f",
  accent: "#c8a27a",
  sale: "#e5484d",
  bg: "#f7f5f2",
};

export const path = (sub = "") => templatePath(TEMPLATE_ID, sub);
