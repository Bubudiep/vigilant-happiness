import { createElement } from "react";
import { AnimationRoutes, App, Route, SnackbarProvider, ZMPRouter } from "zmp-ui";

import ShowcaseNavigation from "@/components/showcase/showcase-nav";
import AccountPage from "@/pages/account";
import ClientsPage from "@/pages/clients";
import ContactPage from "@/pages/contact";
import HomePage from "@/pages/home";
import NotFoundPage from "@/pages/not-found";
import PricingPage from "@/pages/pricing";
import ProcessPage from "@/pages/process";
import { liveTemplates } from "@/templates";
import { DemoActionModal } from "@/templates/_shared/demo-action";
import TemplateFrame from "@/templates/_shared/template-frame";
import TemplateNavigation from "@/templates/_shared/template-navigation";
import { templatePath } from "@/templates/paths";

/**
 * Router gốc:
 *   /                         → Trang chủ Showcase (Công ty T + danh sách demo)
 *   /t/<templateId>/<trang>   → Các trang của từng mẫu (đăng ký trong src/templates/index.ts)
 */
const templateRoutes = liveTemplates.flatMap((t) =>
  (t.routes ?? []).map((r) => (
    <Route
      key={`${t.id}${r.path}`}
      path={templatePath(t.id, r.path)}
      element={<TemplateFrame template={t}>{createElement(r.component)}</TemplateFrame>}
    />
  )),
);

const Layout = () => {
  return (
    <App theme="light">
      <SnackbarProvider>
        <ZMPRouter>
          <AnimationRoutes>
            <Route path="/" element={<HomePage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/process" element={<ProcessPage />} />
            <Route path="/clients" element={<ClientsPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/account" element={<AccountPage />} />
            {templateRoutes}
            <Route path="*" element={<NotFoundPage />} />
          </AnimationRoutes>
          <ShowcaseNavigation />
          <TemplateNavigation />
        </ZMPRouter>
        <DemoActionModal />
      </SnackbarProvider>
    </App>
  );
};

export default Layout;
