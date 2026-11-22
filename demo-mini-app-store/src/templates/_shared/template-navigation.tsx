import { createElement } from "react";
import { useLocation } from "zmp-ui";

import { liveTemplates } from "@/templates";
import { templateBasePath } from "@/templates/paths";

import { TemplateThemeContext } from "./kit/theme";
import { templateTheme } from "./template-frame";

/**
 * Render thanh điều hướng (`meta.navigation`) của mẫu đang mở.
 * Đặt bên ngoài AnimationRoutes để thanh tab đứng yên khi chuyển trang.
 */
export default function TemplateNavigation() {
  const { pathname } = useLocation();
  const template = liveTemplates.find((t) => {
    const base = templateBasePath(t.id);
    return pathname === base || pathname.startsWith(`${base}/`);
  });

  if (!template?.navigation) return null;
  return (
    <TemplateThemeContext.Provider value={templateTheme(template)}>
      {createElement(template.navigation)}
    </TemplateThemeContext.Provider>
  );
}
