import { Page, useNavigate } from "zmp-ui";

import { HowItWorks, Offers, Pricing } from "@/components/showcase/info-sections";
import { company } from "@/data/company";
import { chatWithCompany } from "@/utils/zalo";

/** Tab Bảng giá (bên trái thanh điều hướng trang chủ). */
export default function PricingPage() {
  const navigate = useNavigate();

  return (
    <Page className="bg-[#f4f6fb]">
      <div className="pb-28">
        <header className="sticky top-0 z-40 bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)] safe-top">
          <div className="zalo-capsule-space flex h-12 items-center gap-2.5 pl-4">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-600 text-xs font-black text-white">
              {company.shortName}
            </span>
            <div className="min-w-0">
              <div className="truncate text-sm font-bold text-gray-900">Bảng giá & Ưu đãi</div>
              <div className="truncate text-[11px] text-gray-500">
                {company.name} · {company.owner}
              </div>
            </div>
          </div>
        </header>

        <div className="px-4 pt-4">
          <div className="rounded-2xl bg-gradient-to-br from-brand-700 to-brand-500 p-5 text-white shadow-md">
            <div className="text-xs font-semibold uppercase tracking-wider text-blue-100">
              Chi phí minh bạch · Trọn gói
            </div>
            <div className="mt-1 text-xl font-extrabold leading-snug">
              Triển khai Zalo Mini App chuẩn ngành chỉ từ 5–14 ngày
            </div>
            <div className="mt-1 text-xs text-blue-100">
              Bàn giao đầy đủ quyền quản trị, hỗ trợ duyệt app lên Zalo và bảo hành kỹ thuật.
            </div>
            <div className="mt-3.5 flex gap-2">
              <button
                onClick={() => chatWithCompany("Tôi muốn nhận báo giá chi tiết Mini App")}
                className="rounded-xl bg-white px-4 py-2 text-xs font-bold text-brand-700 shadow-sm"
              >
                Nhận báo giá qua Zalo
              </button>
              <button
                onClick={() => navigate("/", { replace: true, direction: "forward" })}
                className="rounded-xl border border-white/40 px-4 py-2 text-xs font-semibold text-white"
              >
                Xem kho mẫu
              </button>
            </div>
          </div>
        </div>

        <Pricing />
        <Offers />
        <HowItWorks />
      </div>
    </Page>
  );
}
