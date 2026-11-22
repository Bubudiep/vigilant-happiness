import { useNavigate } from "zmp-ui";

import {
  BannerSwiper,
  BrandHeader,
  Card,
  MemberCard,
  SearchBox,
  SectionTitle,
  ShortcutGrid,
  TplPage,
  useDemoAction,
} from "../../_shared/kit";
import { CostumeCard } from "../components";
import { costumes, costumeTypes, path, services } from "../data";

export default function HomePage() {
  const navigate = useNavigate();
  const demoAction = useDemoAction();

  return (
    <TplPage tab>
      <BrandHeader
        logo="👘"
        name="Xiêm Y Studio"
        subtitle="Cho thuê Áo dài, Cổ phục, Váy dự tiệc & Cosplay"
        variant="pastel"
      >
        <SearchBox placeholder="Tìm cổ phục, áo dài, đầm dạ hội..." onClick={() => navigate(path("/catalog"))} />
      </BrandHeader>

      <BannerSwiper
        variant="poster"
        banners={[
          {
            eyebrow: "MÙA CHỤP ẢNH KỶ YẾU & LỄ HỘI",
            title: "Thuê 3 ngày tính tiền 2",
            subtitle: "Miễn phí phụ kiện quạt, mấn, trâm cài & giặt ủi",
            from: "#9a3412",
            to: "#be123c",
            emoji: "🏮",
            cta: "XEM BỘ SƯU TẬP",
            discountBadge: "TẶNG 1 NGÀY",
            onClick: () => navigate(path("/catalog")),
          },
          {
            eyebrow: "LOOKBOOK STUDIO",
            title: "Combo Thuê Đồ + Makeup",
            subtitle: "Trọn gói chỉ từ 490K · Giữ lịch giữ size online",
            from: "#881337",
            to: "#d97706",
            emoji: "👑",
            cta: "ĐẶT LỊCH THỬ ĐỒ",
            discountBadge: "CHỈ 490K",
            onClick: () => navigate(path("/catalog")),
          },
        ]}
      />

      <div className="mt-4">
        <ShortcutGrid
          variant="card"
          cols={4}
          items={[
            ...costumeTypes.slice(1).map((t) => ({
              emoji: t.emoji,
              label: t.label,
              onClick: () => navigate(path(`/catalog?type=${t.id}`)),
            })),
            ...services.slice(0, 2).map((s) => ({
              emoji: s.emoji,
              label: s.label,
              onClick: () => demoAction(s.label),
            })),
          ]}
        />
      </div>

      <div className="mt-4">
        <MemberCard
          variant="vip"
          tier="Khách Hàng Thân Thiết"
          points="Giảm 50% tiền cọc"
          subtitle="Ưu tiên giữ mẫu hot cuối tuần & miễn phí phụ kiện"
          progress={0.7}
          onClick={() => navigate(path("/account"))}
        />
      </div>

      <div className="mt-5">
        <SectionTitle
          title="🔥 Trang phục đang được thuê nhiều"
          subtitle="Cập nhật tình trạng size & lịch trống theo ngày"
          action="Xem tất cả"
          onAction={() => navigate(path("/catalog"))}
        />
        <div className="no-scrollbar mt-3 flex gap-3 overflow-x-auto px-4">
          {costumes
            .filter((c) => c.hot)
            .map((c) => (
              <CostumeCard key={c.id} costume={c} compact />
            ))}
        </div>
      </div>

      <div className="mt-5">
        <SectionTitle title="✨ Toàn bộ danh mục" action="Lọc theo loại" onAction={() => navigate(path("/catalog"))} />
        <div className="mt-3 grid grid-cols-2 gap-3 px-4">
          {costumes.slice(0, 4).map((c) => (
            <CostumeCard key={c.id} costume={c} />
          ))}
        </div>
      </div>

      <div className="mt-5 px-4">
        <Card className="space-y-1 text-xs text-gray-600">
          <div className="text-sm font-bold text-gray-900">📋 Quy định thuê & hoàn cọc minh bạch</div>
          <div>• Giữ đồ theo ngày chọn trên app · Hoàn cọc 100% ngay khi trả đồ</div>
          <div>• Đã bao gồm phí giặt hấp cao cấp · Hỗ trợ chỉnh số đo miễn phí tại tiệm</div>
        </Card>
      </div>
    </TplPage>
  );
}
