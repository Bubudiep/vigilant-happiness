import { Page } from "zmp-ui";

import Contact from "@/components/showcase/contact";
import { Clients } from "@/components/showcase/info-sections";
import { company } from "@/data/company";

/** Tab Liên hệ (bên phải thanh điều hướng trang chủ). */
export default function ContactPage() {
  return (
    <Page className="bg-[#f4f6fb]">
      <div className="pb-28">
        <header className="sticky top-0 z-40 bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)] safe-top">
          <div className="zalo-capsule-space flex h-12 items-center gap-2.5 pl-4">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-600 text-xs font-black text-white">
              {company.shortName}
            </span>
            <div className="min-w-0">
              <div className="truncate text-sm font-bold text-gray-900">Liên hệ & Tư vấn</div>
              <div className="truncate text-[11px] text-gray-500">
                {company.name} · {company.owner}
              </div>
            </div>
          </div>
        </header>

        <Contact />
        <Clients />
      </div>
    </Page>
  );
}
