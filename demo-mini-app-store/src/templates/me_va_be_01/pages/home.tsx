import { useNavigate } from "zmp-ui";

import {
  BannerSwiper,
  BrandHeader,
  Card,
  ProductTileCard,
  SearchBox,
  SectionTitle,
  ShortcutGrid,
  TplPage,
  useDemoAction,
  useTplTheme,
} from "../../_shared/kit";
import { ages, articles, banners, cart, path, products } from "../data";

export default function HomePage() {
  const navigate = useNavigate();
  const demoAction = useDemoAction();
  const theme = useTplTheme();

  return (
    <TplPage tab>
      <BrandHeader logo="🧸" name="Bé Yêu Shop" subtitle="Đồng hành cùng mẹ nuôi con" variant="pastel">
        <SearchBox placeholder="Tìm sữa, bỉm, đồ chơi..." onClick={() => navigate(path("/shop"))} />
      </BrandHeader>

      <div className="px-4 pt-3">
        <Card className="flex items-center gap-3 !p-3" onClick={() => demoAction("Hồ sơ của bé")}>
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold"
            style={{ background: `${theme.primary}14`, color: theme.primary }}
          >
            7m
          </div>
          <div className="flex-1">
            <div className="text-sm font-bold">Bé Na · 7 tháng tuổi</div>
            <div className="text-xs text-gray-500">Gợi ý sản phẩm giai đoạn 6–12 tháng</div>
          </div>
          <span className="text-xs font-semibold" style={{ color: theme.primary }}>
            Đổi ›
          </span>
        </Card>
      </div>

      <div className="mt-3">
        <BannerSwiper
          banners={banners.map((b) => ({
            ...b,
            cta: "Mua ngay",
            onClick: () => navigate(path("/shop")),
          }))}
        />
      </div>

      <div className="mt-3">
        <ShortcutGrid
          cols={4}
          items={ages.slice(1).map((a, i) => ({
            emoji: ["👶", "🍼", "🚼", "🧒"][i],
            label: a.label,
            onClick: () => navigate(path(`/shop?age=${a.id}`)),
          }))}
        />
      </div>

      <div className="mt-4">
        <SectionTitle
          title="Phù hợp với Bé Na"
          action="Xem thêm"
          onAction={() => navigate(path("/shop?age=6_12m"))}
        />
        <div className="mt-2.5 grid grid-cols-2 gap-3 px-4">
          {products
            .filter((p) => p.ages.includes("6_12m"))
            .slice(0, 4)
            .map((p) => (
              <ProductTileCard key={p.id} product={p} store={cart} />
            ))}
        </div>
      </div>

      <div className="mt-4">
        <SectionTitle title="Cẩm nang nuôi con" />
        <div className="mt-2.5 space-y-2 px-4">
          {articles.map((a) => (
            <Card key={a.title} className="flex items-center justify-between gap-3 !p-3" onClick={() => demoAction("Cẩm nang cho mẹ")}>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{a.title}</div>
                <div className="text-[11px] text-gray-400">{a.time}</div>
              </div>
              <span className="text-gray-300">›</span>
            </Card>
          ))}
        </div>
      </div>
    </TplPage>
  );
}
