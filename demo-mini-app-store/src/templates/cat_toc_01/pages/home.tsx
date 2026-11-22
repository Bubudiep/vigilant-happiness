import { useNavigate } from "zmp-ui";

import { BannerSwiper, BrandHeader, MemberCard, SearchBox, SectionTitle, ShortcutGrid, SmartIcon, TplPage, useDemoAction, useTplTheme } from "../../_shared/kit";
import { QueueCard, ServiceRow } from "../components";
import { banners, barbers, hairStyles, path, services } from "../data";

export default function HomePage() {
  const navigate = useNavigate();
  const demoAction = useDemoAction();
  const theme = useTplTheme();

  return (
    <TplPage tab>
      <BrandHeader logo="💈" name="Gentle Barber" subtitle="Cắt tóc nam · Cạo râu khăn nóng" variant="pastel">
        <SearchBox placeholder="Tìm dịch vụ: cắt, cạo, uốn, nhuộm..." onClick={() => navigate(path("/services"))} />
      </BrandHeader>

      <BannerSwiper banners={banners.map((b) => ({ ...b, cta: "Đặt lịch", onClick: () => navigate(path("/services")) }))} />

      <div className="mt-3">
        <QueueCard />
      </div>

      <div className="mt-3">
        <ShortcutGrid
          cols={4}
          items={[
            { emoji: "📅", label: "Đặt lịch", onClick: () => navigate(path("/services")) },
            { emoji: "✂️", label: "Bảng giá", onClick: () => navigate(path("/services")) },
            { emoji: "🎁", label: "Ưu đãi", onClick: () => demoAction("Ưu đãi của tiệm") },
            { emoji: "📍", label: "Chỉ đường", onClick: () => demoAction("Chỉ đường tới tiệm") },
          ]}
        />
      </div>

      <div className="mt-4">
        <SectionTitle title="Dịch vụ được chọn nhiều" action="Bảng giá" onAction={() => navigate(path("/services"))} />
        <div className="mt-2.5 space-y-2.5 px-4">
          {services
            .filter((s) => s.hot)
            .map((s) => (
              <ServiceRow key={s.id} service={s} />
            ))}
        </div>
      </div>

      <div className="mt-4">
        <SectionTitle title="Thợ của tiệm" />
        <div className="no-scrollbar mt-2.5 flex gap-3 overflow-x-auto px-4">
          {barbers.slice(1).map((b) => (
            <div
              key={b.id}
              onClick={() => navigate(path("/book/c01"))}
              className="flex w-28 shrink-0 cursor-pointer flex-col items-center rounded-2xl border border-gray-200/80 bg-white p-3 shadow-sm"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: `${theme.accent}22`, color: theme.primary }}>
                <SmartIcon token={b.emoji} size={22} />
              </span>
              <div className="mt-1.5 text-xs font-bold">{b.name}</div>
              <div className="text-center text-[11px] text-gray-500">{b.title}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <SectionTitle title="Kiểu tóc đang hot" />
        <div className="no-scrollbar mt-2.5 flex gap-2 overflow-x-auto px-4">
          {hairStyles.map((s) => (
            <button
              key={s}
              onClick={() => demoAction(`Xem mẫu kiểu ${s}`)}
              className="shrink-0 rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-gray-700"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 pb-2">
        <MemberCard tier="Thẻ Quý ông" points="Đã cắt 7/10 lần" subtitle="Cắt đủ 10 lần tặng 1 lần cắt miễn phí" onClick={() => navigate(path("/account"))} />
      </div>
    </TplPage>
  );
}
