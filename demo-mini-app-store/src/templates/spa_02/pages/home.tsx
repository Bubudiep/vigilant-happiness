import { useAtomValue } from "jotai";
import { useNavigate } from "zmp-ui";

import { BannerSwiper, BrandHeader, SearchBox, SectionTitle, ShortcutGrid, SmartIcon, TplPage, useDemoAction, useTplTheme } from "../../_shared/kit";
import { ServiceRow } from "../components";
import { banners, findPackage, myPackagesAtom, path, services, therapists } from "../data";

export default function HomePage() {
  const navigate = useNavigate();
  const demoAction = useDemoAction();
  const theme = useTplTheme();
  const mine = useAtomValue(myPackagesAtom)[0];
  const pkg = mine ? findPackage(mine.packageId) : undefined;

  return (
    <TplPage tab>
      <BrandHeader logo="🌿" name="An Nhiên Spa" subtitle="Dưỡng sinh · Massage · Chăm sóc da" variant="pastel">
        <SearchBox placeholder="Tìm: massage, gội dưỡng sinh, trị mụn..." onClick={() => navigate(path("/services"))} />
      </BrandHeader>

      <BannerSwiper banners={banners.map((b) => ({ ...b, cta: "Xem ngay", onClick: () => navigate(path("/packages")) }))} />

      {mine && pkg && (
        <div className="mx-4 mt-3 rounded-2xl p-4 text-white shadow-sm" style={{ background: `linear-gradient(135deg, ${theme.primary}, #14b8a6)` }}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase opacity-80">Liệu trình của bạn</div>
              <div className="mt-0.5 text-sm font-bold">{pkg.name}</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black">{pkg.sessions - mine.used}</div>
              <div className="text-[11px] opacity-80">buổi còn lại</div>
            </div>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/25">
            <div className="h-full rounded-full bg-white" style={{ width: `${(mine.used / pkg.sessions) * 100}%` }} />
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] opacity-90">
            <span>
              Đã dùng {mine.used}/{pkg.sessions} · HSD {mine.expires}
            </span>
            <button onClick={() => navigate(path(`/book/${pkg.serviceId}`))} className="rounded-full bg-white px-3 py-1 text-xs font-bold" style={{ color: theme.primary }}>
              Đặt buổi tiếp
            </button>
          </div>
        </div>
      )}

      <div className="mt-3">
        <ShortcutGrid
          cols={4}
          items={[
            { emoji: "📅", label: "Đặt lịch", onClick: () => navigate(path("/services")) },
            { emoji: "📦", label: "Liệu trình", onClick: () => navigate(path("/packages")) },
            { emoji: "💳", label: "Ví trả trước", onClick: () => demoAction("Nạp ví trả trước") },
            { emoji: "📍", label: "Chi nhánh", onClick: () => demoAction("Hệ thống chi nhánh") },
          ]}
        />
      </div>

      <div className="mt-4">
        <SectionTitle title="Dịch vụ được yêu thích" action="Xem tất cả" onAction={() => navigate(path("/services"))} />
        <div className="mt-2.5 space-y-2.5 px-4">
          {services
            .filter((s) => s.hot)
            .map((s) => (
              <ServiceRow key={s.id} service={s} />
            ))}
        </div>
      </div>

      <div className="mt-4 pb-2">
        <SectionTitle title="Kỹ thuật viên" />
        <div className="no-scrollbar mt-2.5 flex gap-3 overflow-x-auto px-4">
          {therapists.slice(1).map((s) => (
            <div key={s.id} className="flex w-28 shrink-0 flex-col items-center rounded-2xl border border-gray-200/80 bg-white p-3 shadow-sm">
              <span className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: `${theme.primary}14`, color: theme.primary }}>
                <SmartIcon token={s.emoji} size={22} />
              </span>
              <div className="mt-1.5 text-xs font-bold">{s.name}</div>
              <div className="text-center text-[11px] text-gray-500">{s.title}</div>
            </div>
          ))}
        </div>
      </div>
    </TplPage>
  );
}
