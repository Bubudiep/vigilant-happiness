import { useNavigate } from "zmp-ui";

import { BannerSwiper, BrandHeader, formatPrice, SectionTitle, ShortcutGrid, Tile, TplPage, useDemoAction, useTplTheme } from "../../_shared/kit";
import { LiveSession, TopupGrid } from "../components";
import { machines, MY_MACHINE, path, zones } from "../data";

export default function HomePage() {
  const navigate = useNavigate();
  const demoAction = useDemoAction();
  const theme = useTplTheme();

  return (
    <TplPage tab>
      <BrandHeader logo="🎮" name="Zone 9 Gaming" subtitle="Cyber game 24/7 · RTX 40 series" variant="solid" />

      <BannerSwiper
        banners={[
          { title: "Nạp 200K tặng 30K", subtitle: "Áp dụng mọi khu máy", from: "#4c1d95", to: "#7c3aed", emoji: "⚡", eyebrow: "Khuyến mãi", cta: "Nạp ngay", onClick: () => document.getElementById("topup")?.scrollIntoView({ behavior: "smooth" }) },
          { title: "Giải LMHT 5v5 cuối tuần", subtitle: "Giải thưởng 10 triệu · đăng ký theo đội", from: "#0e7490", to: "#22d3ee", emoji: "🏆", eyebrow: "Sự kiện", cta: "Đăng ký", onClick: () => demoAction("Đăng ký giải đấu") },
        ]}
      />

      <div className="mt-3">
        <LiveSession machine={MY_MACHINE} onOrder={() => navigate(path("/menu"))} onTopup={() => document.getElementById("topup")?.scrollIntoView({ behavior: "smooth" })} />
      </div>

      <div className="mt-3">
        <ShortcutGrid
          cols={4}
          items={[
            { emoji: "🖥️", label: "Đặt máy", onClick: () => navigate(path("/machines")) },
            { emoji: "🍜", label: "Gọi đồ", onClick: () => navigate(path("/menu")) },
            { emoji: "🏆", label: "Giải đấu", onClick: () => demoAction("Lịch giải đấu") },
            { emoji: "🎁", label: "Nhiệm vụ", onClick: () => demoAction("Nhiệm vụ nhận giờ chơi") },
          ]}
        />
      </div>

      <div className="mt-4">
        <SectionTitle title="Máy trống ngay lúc này" action="Sơ đồ máy" onAction={() => navigate(path("/machines"))} />
        <div className="mt-2.5 space-y-2.5 px-4">
          {zones.map((z) => {
            const list = machines.filter((m) => m.zone === z.id);
            const free = list.filter((m) => m.status === "free").length;
            return (
              <button key={z.id} onClick={() => navigate(path("/machines"))} className="flex w-full gap-3 rounded-2xl bg-white p-3 text-left shadow-sm">
                <Tile seed={z.image} emoji="🖥️" color={theme.primary} className="h-16 w-20" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold">{z.label}</span>
                    <span className="text-xs font-bold" style={{ color: free ? "#15803d" : "#b91c1c" }}>
                      {free}/{list.length} trống
                    </span>
                  </div>
                  <div className="truncate text-[11px] text-gray-500">{z.spec}</div>
                  <div className="mt-1 text-sm font-black" style={{ color: theme.primary }}>
                    {formatPrice(z.pricePerHour)}
                    <span className="text-[11px] font-semibold text-gray-400">/giờ</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div id="topup" className="mt-4 pb-2">
        <SectionTitle title="Nạp ví giờ chơi" />
        <div className="mt-2.5">
          <TopupGrid />
        </div>
      </div>
    </TplPage>
  );
}
