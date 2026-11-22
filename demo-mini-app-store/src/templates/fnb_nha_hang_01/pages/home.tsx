import { useNavigate } from "zmp-ui";

import {
  BannerSwiper,
  BrandHeader,
  Card,
  formatPrice,
  MemberCard,
  SectionTitle,
  ShortcutGrid,
  Tile,
  TplPage,
  useDemoAction,
  useTplTheme,
  ZaloOACard,
} from "../../_shared/kit";
import { banners, dishes, path } from "../data";

export default function HomePage() {
  const navigate = useNavigate();
  const demoAction = useDemoAction();
  const theme = useTplTheme();

  return (
    <TplPage tab>
      <BrandHeader
        logo="🍲"
        name="Bếp Quê Nhà"
        subtitle="Cơm nhà, vị quê · Mở cửa 10:00 – 22:00"
        variant="solid"
      />

      <BannerSwiper
        variant="poster"
        banners={banners.map((b) => ({
          ...b,
          eyebrow: "ẨM THỰC ĐỒNG QUÊ",
          cta: "ĐẶT BÀN NGAY",
          discountBadge: "GIẢM 15%",
          onClick: () => navigate(path("/reserve")),
        }))}
      />

      <div className="mt-4">
        <ShortcutGrid
          variant="card"
          cols={4}
          items={[
            { emoji: "🪑", label: "Đặt bàn", badge: "Trống", onClick: () => navigate(path("/reserve")) },
            { emoji: "📖", label: "Thực đơn", onClick: () => navigate(path("/menu")) },
            { emoji: "🛵", label: "Giao tận nơi", onClick: () => demoAction("Đặt món giao tận nơi") },
            { emoji: "🎉", label: "Đặt tiệc", badge: "VIP", onClick: () => demoAction("Đặt phòng VIP & tiệc gia đình") },
          ]}
        />
      </div>

      <div className="mt-4">
        <MemberCard
          variant="gradient"
          tier="Khách Thân Thiết"
          points="850 điểm"
          subtitle="Giảm 10% tổng hoá đơn khi đặt bàn trước qua Zalo"
          progress={0.6}
          onClick={() => navigate(path("/account"))}
        />
      </div>

      <div className="mt-5">
        <SectionTitle
          title="🔥 Món đặc sản phải thử"
          subtitle="Chế biến tươi ngon từ nguyên liệu bản địa"
          action="Xem thực đơn"
          onAction={() => navigate(path("/menu"))}
        />
        <div className="mt-3 grid grid-cols-2 gap-3 px-4">
          {dishes
            .filter((d) => d.signature)
            .map((d) => (
              <button
                key={d.id}
                onClick={() => navigate(path("/menu"))}
                className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white text-left shadow-sm"
              >
                <div className="relative">
                  <Tile seed={d.id} emoji={d.emoji} color={d.color} className="aspect-[4/3] w-full" rounded="" size="text-5xl" />
                  <span
                    className="absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold text-white shadow-sm"
                    style={{ background: theme.primary }}
                  >
                    Đặc sản
                  </span>
                </div>
                <div className="p-2.5">
                  <div className="truncate text-xs font-semibold text-gray-800">{d.name}</div>
                  <div className="mt-0.5 text-[10px] text-gray-400">★ 4.9 · Bếp trưởng khuyên dùng</div>
                  <div className="mt-1 text-sm font-extrabold" style={{ color: theme.primary }}>
                    {formatPrice(d.price)}
                  </div>
                </div>
              </button>
            ))}
        </div>
      </div>

      <div className="mt-5">
        <ZaloOACard name="Nhà hàng Bếp Quê Nhà" subtitle="Quan tâm để nhận tặng món tráng miệng khi check-in" logo="🍲" />
      </div>

      <div className="mt-4 px-4">
        <Card className="space-y-1 text-xs text-gray-600">
          <div className="text-sm font-bold text-gray-900">📍 88 Võ Văn Tần, Quận 3, TP.HCM</div>
          <div>⏰ 10:00 – 22:00 mỗi ngày · 🅿️ Có bãi đỗ ô tô miễn phí</div>
          <div>☎️ Hotline đặt tiệc & phòng riêng: 0900 000 000</div>
        </Card>
      </div>
    </TplPage>
  );
}
