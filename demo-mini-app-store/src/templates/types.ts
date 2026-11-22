import type { ComponentType, LazyExoticComponent } from "react";

import type { CategoryId } from "@/data/categories";

import type { TemplateTheme } from "./_shared/kit/theme";

export interface TemplateRoute {
  /** Đường dẫn con, nối sau `/t/<templateId>`. Trang chủ của mẫu là "". */
  path: string;
  component: LazyExoticComponent<ComponentType<any>>;
}

export interface TemplateMeta {
  /** Mã dùng trong link: ?mode=Template&templateID=<id> */
  id: string;
  /** Mã hiển thị, VD "T01" */
  code: string;
  name: string;
  /** Tên thương hiệu giả lập trong mẫu */
  brand?: string;
  description: string;
  categories: CategoryId[];
  /** Màu chủ đạo, dùng cho thumbnail */
  color: string;
  /** Ảnh chụp màn hình / thumbnail tĩnh của mẫu (nếu không truyền sẽ lấy từ src/assets/thumbs/<id>.svg) */
  thumbnail?: string;
  /** Màu dùng bên trong mẫu (kit đọc qua context). Không khai báo thì lấy `color`. */
  theme?: TemplateTheme;
  /** Các tính năng nổi bật, hiển thị trên thẻ */
  features: string[];
  status: "live" | "coming_soon";
  featured?: boolean;
  /** Bắt buộc khi status = "live" */
  routes?: TemplateRoute[];
  /**
   * Thanh tab dưới đáy của mẫu (dùng BottomNavigation của ZaUI).
   * Render một lần ngoài AnimationRoutes; component tự ẩn ở trang không phải tab.
   */
  navigation?: ComponentType;
}
