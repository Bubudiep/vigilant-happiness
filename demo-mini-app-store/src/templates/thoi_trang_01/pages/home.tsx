import { useNavigate } from "zmp-ui";

import {
  BannerSwiper,
  BrandHeader,
  FlashSaleHeader,
  MemberCard,
  SearchBox,
  SectionTitle,
  ShortcutGrid,
} from "../../_shared/kit";
import ProductCard from "../components/product-card";
import ShopPage from "../components/shop-page";
import { BRAND, path } from "../constants";
import { banners, products } from "../data";

export default function HomePage() {
  const navigate = useNavigate();
  const flashSale = products.filter((p) => p.flashSale);

  return (
    <ShopPage tab="home">
      <BrandHeader logo="👗" name={`${BRAND} Studio`} subtitle="Thời trang thiết kế" variant="pastel">
        <SearchBox placeholder="Tìm áo sơ mi, đầm, túi xách..." onClick={() => navigate(path("/category"))} />
      </BrandHeader>

      <BannerSwiper
        banners={banners.map((b) => ({
          ...b,
          cta: "Khám phá",
          emoji: "👗",
          onClick: () => navigate(path("/category")),
        }))}
      />

      <div className="mt-3">
        <ShortcutGrid
          cols={4}
          items={[
            { emoji: "👚", label: "Áo sơ mi", onClick: () => navigate(path("/category?cat=ao")) },
            { emoji: "👖", label: "Quần âu", onClick: () => navigate(path("/category?cat=quan")) },
            { emoji: "👗", label: "Váy đầm", onClick: () => navigate(path("/category?cat=vay")) },
            { emoji: "👜", label: "Phụ kiện", onClick: () => navigate(path("/category?cat=phu_kien")) },
          ]}
        />
      </div>

      <div className="mt-3">
        <MemberCard
          tier="Hạng Bạc"
          points="1.450 điểm"
          subtitle="Tích điểm · Nhận ưu đãi"
          onClick={() => navigate(path("/account"))}
        />
      </div>

      <section className="mt-4 border-y border-gray-100 bg-white py-3.5">
        <FlashSaleHeader onMore={() => navigate(path("/category"))} />
        <div className="no-scrollbar mt-2.5 flex gap-3 overflow-x-auto px-4">
          {flashSale.map((p) => (
            <ProductCard key={p.id} product={p} compact />
          ))}
        </div>
      </section>

      <section className="mt-4">
        <SectionTitle title="Sản phẩm nổi bật" action="Xem thêm" onAction={() => navigate(path("/category"))} />
        <div className="mt-2.5 grid grid-cols-2 gap-3 px-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
    </ShopPage>
  );
}
