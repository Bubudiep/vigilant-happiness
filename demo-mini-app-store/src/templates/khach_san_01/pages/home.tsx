import { useNavigate } from "zmp-ui";

import {
  BannerSwiper,
  BrandHeader,
  Card,
  MemberCard,
  PrimaryButton,
  SectionTitle,
  ShortcutGrid,
  TplPage,
  useDemoAction,
  useTplTheme,
} from "../../_shared/kit";
import { RoomCard, StayPicker } from "../components";
import { amenities, path, rooms } from "../data";

export default function HomePage() {
  const navigate = useNavigate();
  const demoAction = useDemoAction();
  const theme = useTplTheme();

  return (
    <TplPage tab>
      <BrandHeader logo="🏨" name="Sea Breeze Resort" subtitle="Nha Trang · ★★★★★ · Bãi biển riêng" variant="pastel" />

      <BannerSwiper
        variant="poster"
        banners={[
          {
            eyebrow: "KỲ NGHỈ TRỌN VẸN",
            title: "Đặt sớm giảm 25%",
            subtitle: "Tặng buffet sáng & trả phòng muộn 14:00",
            from: "#0369a1",
            to: "#0ea5e9",
            emoji: "🏖️",
            cta: "CHỌN PHÒNG NGAY",
            discountBadge: "GIẢM 25%",
            onClick: () => navigate(path("/rooms")),
          },
          {
            eyebrow: "HONEYMOON PACKAGE",
            title: "Villa hướng biển",
            subtitle: "Tặng bữa tối lãng mạn & liệu trình Spa đôi",
            from: "#0f766e",
            to: "#38bdf8",
            emoji: "🥂",
            cta: "KHÁM PHÁ",
            discountBadge: "COMBO VIP",
            onClick: () => navigate(path("/rooms")),
          },
        ]}
      />

      <div className="px-4 pt-3">
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold">🔍 Tìm phòng trống</span>
            <span className="text-xs font-medium text-emerald-600">✓ Đảm bảo giá tốt nhất</span>
          </div>
          <StayPicker />
          <PrimaryButton className="w-full" onClick={() => navigate(path("/rooms"))}>
            Tìm phòng ngay
          </PrimaryButton>
        </Card>
      </div>

      <div className="mt-4">
        <MemberCard
          variant="vip"
          tier="Sea Breeze Gold"
          points="4.200 dặm nghỉ dưỡng"
          subtitle="Miễn phí nâng hạng phòng Ocean View khi còn trống"
          progress={0.82}
          onClick={() => navigate(path("/account"))}
        />
      </div>

      <div className="mt-5">
        <SectionTitle
          title="🛏️ Hạng phòng nổi bật"
          subtitle="Ban công hướng biển 100%"
          action="Xem tất cả"
          onAction={() => navigate(path("/rooms"))}
        />
        <div className="no-scrollbar mt-3 flex gap-3 overflow-x-auto px-4">
          {rooms.map((r) => (
            <RoomCard key={r.id} room={r} compact />
          ))}
        </div>
      </div>

      <div className="mt-5">
        <SectionTitle title="🌴 Dịch vụ & Tiện ích 5 sao" />
        <div className="mt-3">
          <ShortcutGrid
            variant="card"
            cols={4}
            items={[
              ...amenities.map((a) => ({
                emoji: a.emoji,
                label: a.label,
                onClick: () => demoAction(a.label),
              })),
            ]}
          />
        </div>
      </div>

      <div className="mt-5 px-4">
        <Card className="flex items-center gap-4">
          <div className="rounded-2xl px-3.5 py-2.5 text-2xl font-black text-white shadow-sm" style={{ background: theme.primary }}>
            9.4
          </div>
          <div>
            <div className="text-sm font-bold">Tuyệt hảo · Top 5 Resort Nha Trang</div>
            <div className="text-xs text-gray-500">Từ 1.248 đánh giá xác thực của khách lưu trú</div>
          </div>
        </Card>
      </div>
    </TplPage>
  );
}
