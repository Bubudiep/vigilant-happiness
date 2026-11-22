import { useNavigate } from "zmp-ui";

import {
  BannerSwiper,
  BrandHeader,
  FlashSaleHeader,
  MemberCard,
  ProductTileCard,
  SearchBox,
  SectionTitle,
  ShortcutGrid,
  TplPage,
  useDemoAction,
  useTplTheme,
} from "../../_shared/kit";
import { banners, cart, groceryCategories, path, products } from "../data";

export default function HomePage() {
  const navigate = useNavigate();
  const demoAction = useDemoAction();
  const theme = useTplTheme();
  const deals = products.filter((p) => p.salePrice);
  const fresh = products.filter((p) => p.category === "rau" || p.category === "trai_cay");

  return (
    <TplPage tab>
      <BrandHeader logo="🛒" name="Xanh Mart" subtitle="Tươi ngon mỗi ngày – Giao siêu tốc 2H" variant="solid">
        <SearchBox placeholder="Tìm rau sạch, thịt cá, sữa tươi..." onClick={() => navigate(path("/category"))} />
      </BrandHeader>

      <div className="flex items-center gap-2 px-4 py-2 text-xs" style={{ background: `${theme.primary}14`, color: theme.primary }}>
        <span>📍 Giao đến: 12 Nguyễn Huệ, Q.1</span>
        <span className="ml-auto font-bold">⚡ Nhận lúc 10:30</span>
      </div>

      <BannerSwiper
        variant="split"
        banners={banners.map((b) => ({
          ...b,
          cta: "Đi chợ ngay",
          onClick: () => navigate(path("/category")),
        }))}
      />

      <div className="mt-4">
        <ShortcutGrid
          variant="card"
          cols={4}
          items={groceryCategories.map((c, i) => ({
            emoji: c.emoji,
            label: c.label,
            badge: i === 0 ? "Tươi" : i === 2 ? "Hot" : undefined,
            onClick: () => navigate(path(`/category?cat=${c.id}`)),
          }))}
        />
      </div>

      <div className="mt-4">
        <MemberCard
          variant="minimal"
          tier="Thẻ Xanh Plus"
          points="920 điểm"
          subtitle="Hoàn tiền 3% mọi đơn rau củ hữu cơ"
          onClick={() => navigate(path("/account"))}
        />
      </div>

      <section className="mt-5 border-y border-gray-100 bg-white py-4 shadow-sm">
        <FlashSaleHeader subtitle="Giờ vàng giá sốc – Tươi mới trong ngày" onMore={() => navigate(path("/category"))} />
        <div className="no-scrollbar mt-3 flex gap-3 overflow-x-auto px-4">
          {deals.map((p) => (
            <ProductTileCard key={p.id} product={p} store={cart} compact variant="poster" />
          ))}
        </div>
      </section>

      <div className="mt-5">
        <SectionTitle
          title="🥬 Rau củ & Trái cây tươi"
          subtitle="Thu hoạch sáng nay từ nông trại Đà Lạt"
          action="Tất cả"
          onAction={() => navigate(path("/category"))}
        />
        <div className="mt-3 grid grid-cols-2 gap-3 px-4">
          {fresh.map((p) => (
            <ProductTileCard key={p.id} product={p} store={cart} variant="editorial" />
          ))}
        </div>
      </div>
    </TplPage>
  );
}
