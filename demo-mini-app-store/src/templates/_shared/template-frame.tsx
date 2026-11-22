import { ReactNode, Suspense, useEffect, useMemo } from "react";
import { Page, Spinner } from "zmp-ui";

import type { TemplateMeta } from "@/templates/types";
import { rememberViewedTemplate } from "@/utils/api";

import DemoBar from "./demo-bar";
import { defaultTheme, TemplateTheme, TemplateThemeContext } from "./kit/theme";

export function templateTheme(t: TemplateMeta): TemplateTheme {
  return {
    ...(t.theme ?? { ...defaultTheme, primary: t.color }),
    templateId: t.id,
    templateName: t.name,
    templateCode: t.code,
    brand: t.brand,
  };
}

/** Bọc mọi trang của một mẫu: theme + lazy-load + nút DEMO nổi. */
export default function TemplateFrame({ template, children }: { template: TemplateMeta; children: ReactNode }) {
  const theme = useMemo(() => templateTheme(template), [template]);
  useEffect(() => rememberViewedTemplate(template.id), [template.id]);
  return (
    <TemplateThemeContext.Provider value={theme}>
      <Suspense fallback={<TemplateLoading />}>{children}</Suspense>
      <DemoBar template={template} />
    </TemplateThemeContext.Provider>
  );
}

function TemplateLoading() {
  return (
    <Page className="flex items-center justify-center bg-white">
      <Spinner visible />
    </Page>
  );
}
