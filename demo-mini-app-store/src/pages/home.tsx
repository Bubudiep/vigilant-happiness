import { useEffect, useState } from "react";
import { Page, useNavigate, useSnackbar } from "zmp-ui";

import Contact from "@/components/showcase/contact";
import Hero from "@/components/showcase/hero";
import { Clients, HowItWorks, Offers, Pricing } from "@/components/showcase/info-sections";
import TemplateGallery from "@/components/showcase/template-gallery";
import { consumeLaunchTemplateId, hasPendingLaunchTemplate } from "@/hooks/use-launch-params";
import { findLiveTemplate, findTemplate } from "@/templates";
import { templateBasePath } from "@/templates/paths";

/**
 * Trang chủ (Showcase) của Công ty T.
 * Lúc khởi động, nếu link có ?mode=Template&templateID=... thì chuyển thẳng vào mẫu đó.
 */
export default function HomePage() {
  const navigate = useNavigate();
  const { openSnackbar } = useSnackbar();
  const [redirecting, setRedirecting] = useState(hasPendingLaunchTemplate);

  useEffect(() => {
    const id = consumeLaunchTemplateId();
    if (!id) return;

    const live = findLiveTemplate(id);
    if (live) {
      navigate(templateBasePath(live.id), { replace: true, animate: false });
      return;
    }

    setRedirecting(false);
    const known = findTemplate(id);
    openSnackbar({
      text: known ? `Mẫu "${known.name}" đang được hoàn thiện` : `Không tìm thấy mẫu "${id}"`,
      type: "warning",
      duration: 4000,
    });
  }, []);

  if (redirecting) return <Page className="bg-white" />;

  return (
    <Page restoreScroll className="bg-[#f4f6fb]">
      <div className="pb-24">
        <Hero
          onViewDemos={() =>
            document.getElementById("demo-gallery")?.scrollIntoView({ behavior: "smooth", block: "start" })
          }
        />
        <TemplateGallery />
        <HowItWorks />
        <Offers />
        <Clients />
        <Pricing />
        <Contact />
      </div>
    </Page>
  );
}
