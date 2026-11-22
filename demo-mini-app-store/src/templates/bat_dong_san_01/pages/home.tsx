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
  useTplTheme,
} from "../../_shared/kit";
import { ProjectCard } from "../components";
import { path, projects, propertyTypes } from "../data";

export default function HomePage() {
  const navigate = useNavigate();
  const demoAction = useDemoAction();
  const theme = useTplTheme();

  return (
    <TplPage tab>
      <BrandHeader logo="🏙️" name="An Cư Land" subtitle="Hệ sinh thái Bất động sản cao cấp" variant="solid">
        <SearchBox placeholder="Tìm dự án, khu vực, căn hộ..." onClick={() => navigate(path("/projects"))} />
      </BrandHeader>

      <BannerSwiper
        variant="poster"
        banners={[
          {
            eyebrow: "DỰ ÁN TÂM ĐIỂM 2026",
            title: "Sky Garden Residence",
            subtitle: "Thanh toán 15% nhận nhà · Hỗ trợ lãi suất 0% 24 tháng",
            from: theme.primary,
            to: "#2b547e",
            emoji: "🏙️",
            cta: "XEM BẢNG GIÁ",
            discountBadge: "CHIẾT KHẤU 8%",
            onClick: () => navigate(path("/project/p1")),
          },
          {
            eyebrow: "BIỆT THỰ VEN SÔNG",
            title: "The River Marina",
            subtitle: "Bến du thuyền riêng · Pháp lý sổ hồng từng căn",
            from: "#1e3a5f",
            to: "#b45309",
            emoji: "🛥️",
            cta: "ĐĂNG KÝ THAM QUAN",
            discountBadge: "TẶNG 5 LƯỢNG VÀNG",
            onClick: () => navigate(path("/projects")),
          },
        ]}
      />

      <div className="mt-4">
        <ShortcutGrid
          variant="card"
          cols={4}
          items={[
            ...propertyTypes.slice(1).map((t, i) => ({
              emoji: ["🏢", "🏡", "🌾"][i],
              label: t.label,
              onClick: () => navigate(path(`/projects?type=${t.id}`)),
            })),
            { emoji: "🧮", label: "Tính vay NH", badge: "0%", onClick: () => demoAction("Công cụ tính lãi vay ngân hàng") },
            { emoji: "🗺️", label: "Quy hoạch", onClick: () => demoAction("Bản đồ quy hoạch") },
            { emoji: "🎥", label: "VR 360°", badge: "3D", onClick: () => demoAction("Xem nhà mẫu VR 360°") },
            { emoji: "📑", label: "Bảng giá", onClick: () => demoAction("Tải bảng giá & chính sách") },
            { emoji: "🤝", label: "Ký gửi", onClick: () => demoAction("Ký gửi mua bán / cho thuê") },
          ]}
        />
      </div>

      <div className="mt-4">
        <MemberCard
          variant="vip"
          tier="Nhà Đầu Tư VIP"
          points="Chiết khấu thêm 1.5%"
          subtitle="Đặc quyền chọn căn đẹp trước ngày mở bán chính thức"
          progress={0.85}
          onClick={() => navigate(path("/account"))}
        />
      </div>

      <div className="mt-5">
        <SectionTitle
          title="🔥 Dự án đang mở bán"
          subtitle="Pháp lý minh bạch · Ngân hàng bảo lãnh"
          action="Xem tất cả"
          onAction={() => navigate(path("/projects"))}
        />
        <div className="mt-3 space-y-3 px-4">
          {projects
            .filter((p) => p.hot)
            .map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
        </div>
      </div>

      <div className="mt-5 px-4">
        <Card className="flex items-center gap-3" onClick={() => demoAction("Đặt xe đưa đón xem nhà mẫu")}>
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-2xl">🚘</span>
          <div className="flex-1">
            <div className="text-sm font-bold">Đặt lịch xe đưa đón xem sa bàn</div>
            <div className="text-xs text-gray-500">Miễn phí 100% · Chuyên viên tư vấn 1-1</div>
          </div>
          <span className="text-sm font-bold" style={{ color: theme.primary }}>
            Đặt ›
          </span>
        </Card>
      </div>
    </TplPage>
  );
}
