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
import { banners, cart, gifts, occasions, path, recipients } from "../data";

export default function HomePage() {
  const navigate = useNavigate();
  const demoAction = useDemoAction();
  const theme = useTplTheme();

  return (
    <TplPage tab>
      <BrandHeader logo="🎁" name="Hộp Quà Xinh" subtitle="Gói trọn yêu thương" variant="pastel">
        <SearchBox placeholder="Tìm quà: hoa sáp, nến thơm, ví da..." onClick={() => navigate(path("/shop"))} />
      </BrandHeader>

      <BannerSwiper
        banners={banners.map((b) => ({
          ...b,
          cta: "Chọn quà",
          onClick: () => navigate(path("/shop")),
        }))}
      />

      <div className="mt-3">
        <ShortcutGrid
          cols={4}
          items={occasions.slice(1, 5).map((o) => ({
            emoji: o.emoji,
            label: o.label,
            onClick: () => navigate(path(`/shop?occasion=${o.id}`)),
          }))}
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-2 px-4">
        {recipients.slice(1).map((r) => (
          <button
            key={r.id}
            onClick={() => navigate(path(`/shop?for=${r.id}`))}
            className="rounded-full border bg-white px-3.5 py-1 text-xs font-medium"
            style={{ borderColor: `${theme.primary}33`, color: theme.primary }}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="mt-3 px-4">
        <Card className="flex items-center justify-between gap-3" onClick={() => demoAction("Thiết kế hộp quà theo yêu cầu")}>
          <div>
            <div className="text-sm font-bold">Tự thiết kế hộp quà</div>
            <div className="text-xs text-gray-500">Chọn món, chọn hộp, in ảnh & lời chúc</div>
          </div>
          <span className="font-bold" style={{ color: theme.primary }}>›</span>
        </Card>
      </div>

      <div className="mt-4">
        <SectionTitle title="Quà tặng được chọn nhiều" action="Xem tất cả" onAction={() => navigate(path("/shop"))} />
        <div className="mt-2.5 grid grid-cols-2 gap-3 px-4">
          {gifts.map((g) => (
            <ProductTileCard key={g.id} product={g} store={cart} />
          ))}
        </div>
      </div>
    </TplPage>
  );
}
