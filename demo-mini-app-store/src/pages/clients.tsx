import { Page, useNavigate } from "zmp-ui";

import { Clients } from "@/components/showcase/info-sections";
import { company, stats } from "@/data/company";
import { chatWithCompany } from "@/utils/zalo";

/** Tab Khách hàng (nằm giữa Trang chủ và Liên hệ). */
export default function ClientsPage() {
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
              <div className="truncate text-sm font-bold text-gray-900">Khách hàng tiêu biểu</div>
              <div className="truncate text-[11px] text-gray-500">
                {company.name} · {company.owner}
              </div>
            </div>
          </div>
        </header>

        <div className="px-4 pt-4">
          <div className="grid grid-cols-2 gap-2.5">
            {stats.map((s) => (
              <div key={s.label} className="rounded-2xl bg-white p-3.5 text-center shadow-sm ring-1 ring-black/5">
                <div className="text-xl font-extrabold text-brand-600">{s.value}</div>
                <div className="mt-0.5 text-xs text-gray-500">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <Clients />

        <div className="px-4 pt-2">
          <div className="rounded-2xl bg-gradient-to-br from-brand-700 to-brand-500 p-5 text-white shadow-md">
            <div className="text-base font-extrabold">Đồng hành cùng doanh nghiệp tăng trưởng trên Zalo</div>
            <div className="mt-1 text-xs text-blue-100">
              Trải nghiệm trực tiếp 15+ mẫu demo theo ngành hoặc nhận tư vấn giải pháp riêng cho thương hiệu của bạn.
            </div>
            <div className="mt-3.5 flex gap-2">
              <button
                onClick={() => navigate("/", { replace: true, direction: "backward" })}
                className="rounded-xl bg-white px-4 py-2 text-xs font-bold text-brand-700"
              >
                Khám phá kho mẫu
              </button>
              <button
                onClick={() => chatWithCompany("Tôi muốn xem thêm case study theo ngành của mình")}
                className="rounded-xl border border-white/40 px-4 py-2 text-xs font-semibold text-white"
              >
                Chat tư vấn
              </button>
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
}
