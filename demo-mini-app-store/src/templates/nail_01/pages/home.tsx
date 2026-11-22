import { useNavigate } from "zmp-ui";

import { BannerSwiper, BrandHeader, MemberCard, SearchBox, SectionTitle, ShortcutGrid, SmartIcon, TplPage, useDemoAction, useTplTheme } from "../../_shared/kit";
import { DesignSwatch, ServiceRow } from "../components";
import { artists, banners, designs, path, services } from "../data";

export default function HomePage() {
  const navigate = useNavigate();
  const demoAction = useDemoAction();
  const theme = useTplTheme();

  return (
    <TplPage tab>
      <BrandHeader logo="💅" name="Mây Nail Studio" subtitle="Nail · Mi · Chăm sóc da tay chân" variant="pastel">
        <SearchBox placeholder="Tìm: sơn gel, vẽ, đắp móng..." onClick={() => navigate(path("/services"))} />
      </BrandHeader>

      <BannerSwiper banners={banners.map((b) => ({ ...b, cta: "Đặt lịch", onClick: () => navigate(path("/services")) }))} />

      <div className="mt-3">
        <ShortcutGrid
          cols={4}
          items={[
            { emoji: "📅", label: "Đặt lịch", onClick: () => navigate(path("/services")) },
            { emoji: "🎨", label: "Mẫu nail", onClick: () => navigate(path("/book/n01")) },
            { emoji: "🎁", label: "Ưu đãi", onClick: () => demoAction("Ưu đãi tháng này") },
            { emoji: "📍", label: "Chỉ đường", onClick: () => demoAction("Chỉ đường tới tiệm") },
          ]}
        />
      </div>

      <div className="mt-4">
        <SectionTitle title="Mẫu nail hot tuần này" action="Đặt theo mẫu" onAction={() => navigate(path("/book/n01"))} />
        <div className="no-scrollbar mt-2.5 flex gap-2.5 overflow-x-auto px-4">
          {designs.map((d) => (
            <DesignSwatch key={d.id} colors={d.colors} label={d.name} onClick={() => navigate(path("/book/n01"))} />
          ))}
        </div>
      </div>

      <div className="mt-4">
        <SectionTitle title="Dịch vụ nổi bật" action="Bảng giá" onAction={() => navigate(path("/services"))} />
        <div className="mt-2.5 space-y-2.5 px-4">
          {services
            .filter((s) => s.hot)
            .map((s) => (
              <ServiceRow key={s.id} service={s} />
            ))}
        </div>
      </div>

      <div className="mt-4">
        <SectionTitle title="Thợ nail" />
        <div className="no-scrollbar mt-2.5 flex gap-3 overflow-x-auto px-4">
          {artists.slice(1).map((a) => (
            <div
              key={a.id}
              onClick={() => navigate(path("/book/n02"))}
              className="flex w-28 shrink-0 cursor-pointer flex-col items-center rounded-2xl border border-gray-200/80 bg-white p-3 shadow-sm"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: `${theme.primary}14`, color: theme.primary }}>
                <SmartIcon token={a.emoji} size={22} />
              </span>
              <div className="mt-1.5 text-xs font-bold">{a.name}</div>
              <div className="text-center text-[11px] text-gray-500">{a.title}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 pb-2">
        <MemberCard tier="Hạng Hồng" points="420 điểm" subtitle="Tích 10% mỗi lần làm · đổi điểm lấy dưỡng móng" onClick={() => navigate(path("/account"))} />
      </div>
    </TplPage>
  );
}
