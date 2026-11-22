import { useNavigate } from "zmp-ui";

import {
  BannerSwiper,
  BrandHeader,
  Card,
  MemberCard,
  SectionTitle,
  ShortcutGrid,
  Tile,
  TplPage,
  useDemoAction,
  useTplTheme,
} from "../../_shared/kit";
import { BlankCard } from "../components";
import { blanks, gallery, path } from "../data";

export default function HomePage() {
  const navigate = useNavigate();
  const demoAction = useDemoAction();
  const theme = useTplTheme();

  return (
    <TplPage tab>
      <BrandHeader
        logo="🪡"
        name="Thêu Xinh Atelier"
        subtitle="Thêu tay & thêu vi tính theo yêu cầu"
        variant="pastel"
      />

      <BannerSwiper
        variant="poster"
        banners={[
          {
            eyebrow: "CUSTOM EMBROIDERY",
            title: "Thêu tên & hình riêng",
            subtitle: "Xem trước bản thiết kế trực tiếp · Duyệt ảnh trước khi giao",
            from: theme.primary,
            to: "#5fb3a8",
            emoji: "🪡",
            cta: "THIẾT KẾ NGAY",
            discountBadge: "FREE FONT",
            onClick: () => navigate(path("/products")),
          },
          {
            eyebrow: "QUÀ TẶNG ĐỘC BẢN",
            title: "Áo đôi & Khăn thêu chữ",
            subtitle: "Giảm 15% khi đặt thêu theo cặp",
            from: "#d97706",
            to: "#e76f51",
            emoji: "🧶",
            cta: "CHỌN PHÔI THÊU",
            discountBadge: "GIẢM 15%",
            onClick: () => navigate(path("/products")),
          },
        ]}
      />

      <div className="mt-4">
        <ShortcutGrid
          variant="card"
          cols={4}
          items={[
            { emoji: "👕", label: "Áo phông", badge: "Hot", onClick: () => navigate(path("/custom/b1")) },
            { emoji: "👜", label: "Túi tote", onClick: () => navigate(path("/custom/b2")) },
            { emoji: "🧣", label: "Khăn tắm", onClick: () => navigate(path("/custom/b3")) },
            { emoji: "🧢", label: "Mũ lưỡi trai", onClick: () => navigate(path("/custom/b4")) },
            { emoji: "✍️", label: "Thêu tên", onClick: () => navigate(path("/products")) },
            { emoji: "🌸", label: "Hoạ tiết", onClick: () => navigate(path("/products")) },
            { emoji: "🖼️", label: "Ảnh chân dung", badge: "Mới", onClick: () => demoAction("Thêu chân dung từ ảnh chụp") },
            { emoji: "📦", label: "Đơn sỉ / lớp", onClick: () => demoAction("Báo giá thêu đồng phục") },
          ]}
        />
      </div>

      <div className="mt-4">
        <MemberCard
          variant="stamp"
          stampCurrent={3}
          stampTotal={5}
          stampLabel="Đặt đủ 5 món tặng miễn phí 1 túi tote thêu tên"
          onClick={() => navigate(path("/account"))}
        />
      </div>

      <div className="mt-5">
        <SectionTitle
          title="✨ Chọn phôi để bắt đầu thêu"
          subtitle="Bấm vào sản phẩm để nhập chữ & xem trước"
          action="Tất cả mẫu"
          onAction={() => navigate(path("/products"))}
        />
        <div className="mt-3 grid grid-cols-2 gap-3 px-4">
          {blanks
            .filter((b) => b.popular)
            .map((b) => (
              <BlankCard key={b.id} blank={b} />
            ))}
        </div>
      </div>

      <div className="mt-5">
        <SectionTitle title="📸 Tác phẩm khách đã đặt" subtitle="100% ảnh chụp sản phẩm thật tại xưởng" />
        <div className="no-scrollbar mt-3 flex gap-3 overflow-x-auto px-4">
          {gallery.map((g, gi) => (
            <div key={g.title} className="w-40 shrink-0 overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm">
              <Tile seed={`g${gi}`} emoji={g.emoji} color={g.color} className="aspect-square w-full" rounded="" size="text-5xl" />
              <div className="p-2.5 text-xs font-medium text-gray-800">{g.title}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 px-4">
        <Card className="flex items-center gap-3" onClick={() => demoAction("Gửi thiết kế / logo riêng")}>
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-2xl">🖌️</span>
          <div className="flex-1">
            <div className="text-sm font-bold">Có sẵn hình vẽ hoặc logo công ty?</div>
            <div className="text-xs text-gray-500">Gửi ảnh qua Zalo, tiệm lên mẫu thử & báo giá trong 2 giờ</div>
          </div>
          <span className="font-bold" style={{ color: theme.primary }}>›</span>
        </Card>
      </div>
    </TplPage>
  );
}
