import { LuBadgeCheck, LuPalette, LuShieldCheck, LuZap } from "react-icons/lu";
import { Page, useNavigate } from "zmp-ui";

import { HowItWorks, Offers } from "@/components/showcase/info-sections";
import { company } from "@/data/company";
import { chatWithCompany } from "@/utils/zalo";

const guarantees = [
  { icon: LuZap, title: "Đúng tiến độ cam kết", text: "Bàn giao bản chạy thử trong 3–5 ngày làm việc." },
  { icon: LuPalette, title: "Chuẩn nhận diện thương hiệu", text: "Tuỳ biến màu sắc, logo, bố cục theo đúng ngành nghề." },
  { icon: LuBadgeCheck, title: "Hỗ trợ duyệt lên Zalo", text: "Đồng hành trọn gói thủ tục xét duyệt Mini App và Zalo OA." },
  { icon: LuShieldCheck, title: "Bảo hành & đồng hành", text: "Hỗ trợ kỹ thuật nhanh chóng trong suốt quá trình vận hành." },
];

/** Tab Quy trình (nằm giữa Bảng giá và Trang chủ). */
export default function ProcessPage() {
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
              <div className="truncate text-sm font-bold text-gray-900">Quy trình triển khai</div>
              <div className="truncate text-[11px] text-gray-500">
                {company.name} · {company.owner}
              </div>
            </div>
          </div>
        </header>

        <HowItWorks />

        <section className="px-4 py-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-brand-600">Cam kết dịch vụ</div>
          <h2 className="mt-0.5 text-lg font-bold text-gray-900">An tâm triển khai từ A – Z</h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {guarantees.map((g) => {
              const IconComp = g.icon;
              return (
                <div key={g.title} className="rounded-2xl border border-gray-200/80 bg-white p-3.5 shadow-sm">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <IconComp size={20} />
                  </span>
                  <div className="mt-2 text-sm font-bold text-gray-900">{g.title}</div>
                  <div className="mt-1 text-xs leading-relaxed text-gray-500">{g.text}</div>
                </div>
              );
            })}
          </div>
        </section>

        <Offers />

        <div className="px-4 pt-2">
          <div className="rounded-2xl border border-gray-200/80 bg-white p-4 text-center shadow-sm">
            <div className="text-sm font-bold text-gray-900">Bạn đã chọn được mẫu ưng ý?</div>
            <div className="mt-1 text-xs text-gray-500">
              Gửi mẫu bạn thích để đội ngũ lên bản demo mang thương hiệu của bạn.
            </div>
            <div className="mt-3 flex justify-center gap-2">
              <button
                onClick={() => navigate("/", { replace: true, direction: "forward" })}
                className="rounded-xl bg-gray-100 px-4 py-2.5 text-xs font-semibold text-gray-800"
              >
                Xem kho mẫu
              </button>
              <button
                onClick={() => chatWithCompany("Tôi muốn tư vấn quy trình triển khai Mini App")}
                className="rounded-xl bg-brand-600 px-4 py-2.5 text-xs font-bold text-white"
              >
                Tư vấn ngay
              </button>
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
}
