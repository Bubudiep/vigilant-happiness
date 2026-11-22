/** Đường dẫn gốc của một mẫu demo trong router. */
export function templateBasePath(templateId: string): string {
  return `/t/${templateId}`;
}

/** Tạo đường dẫn tới một trang con của mẫu. */
export function templatePath(templateId: string, subPath = ""): string {
  if (!subPath) return templateBasePath(templateId);
  return `${templateBasePath(templateId)}${subPath.startsWith("/") ? "" : "/"}${subPath}`;
}
