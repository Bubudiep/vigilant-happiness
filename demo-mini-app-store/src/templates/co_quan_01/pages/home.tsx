import { useNavigate } from "zmp-ui";

import {
  BannerSwiper,
  BrandHeader,
  Card,
  SearchBox,
  SectionTitle,
  ShortcutGrid,
  TplPage,
  useDemoAction,
  useTplTheme,
  ZaloOACard,
} from "../../_shared/kit";
import { NewsRow } from "../components";
import { AGENCY, news, path } from "../data";

export default function HomePage() {
  const navigate = useNavigate();
  const demoAction = useDemoAction();
  const theme = useTplTheme();

  return (
    <TplPage tab>
      <BrandHeader logo="🏛️" name={AGENCY} subtitle="Cổng Dịch vụ công & Tiện ích đô thị số" variant="solid">
        <SearchBox placeholder="Tìm thủ tục: hộ tịch, đất đai, chứng thực..." onClick={() => navigate(path("/procedures"))} />
      </BrandHeader>

      <BannerSwiper
        variant="split"
        banners={[
          {
            eyebrow: "CHÍNH QUYỀN SỐ",
            title: "Làm thủ tục không cần xếp hàng",
            subtitle: "Nộp hồ sơ, đặt lịch hẹn, nhận kết quả tại nhà",
            from: theme.primary,
            to: "#dc2626",
            emoji: "🏛️",
            cta: "Nộp hồ sơ",
            onClick: () => navigate(path("/procedures")),
          },
          {
            eyebrow: "TIẾP NHẬN 24/7",
            title: "Phản ánh hiện trường",
            subtitle: "Gửi ảnh chụp hạ tầng, trật tự đô thị chỉ trong 30 giây",
            from: "#1d4ed8",
            to: "#2563eb",
            emoji: "📸",
            cta: "Gửi phản ánh",
            onClick: () => navigate(path("/feedback")),
          },
        ]}
      />

      <div className="mt-4">
        <ShortcutGrid
          variant="card"
          cols={4}
          items={[
            { emoji: "📄", label: "Thủ tục HC", badge: "Online", onClick: () => navigate(path("/procedures")) },
            { emoji: "🔎", label: "Tra cứu HS", onClick: () => demoAction("Tra cứu tiến độ hồ sơ bằng mã biên nhận") },
            { emoji: "📅", label: "Đặt lịch hẹn", onClick: () => demoAction("Đặt lịch hẹn Bộ phận Một cửa") },
            { emoji: "📸", label: "Phản ánh", badge: "24/7", onClick: () => navigate(path("/feedback")) },
            { emoji: "📰", label: "Tin tức", onClick: () => navigate(path("/news")) },
            { emoji: "☎️", label: "Danh bạ", onClick: () => demoAction("Danh bạ điện thoại đường dây nóng") },
            { emoji: "📊", label: "Khảo sát", onClick: () => demoAction("Đánh giá mức độ hài lòng") },
            { emoji: "🗺️", label: "Bản đồ số", onClick: () => demoAction("Bản đồ tiện ích & quy hoạch") },
          ]}
        />
      </div>

      <div className="mt-4 px-4">
        <Card className="flex items-center gap-3 !p-3.5">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-2xl">🚨</span>
          <div className="flex-1 text-sm">
            <div className="font-bold">Đường dây nóng khẩn cấp</div>
            <div className="text-xs text-gray-500">Công an 113 · Cứu hoả 114 · Cấp cứu 115</div>
          </div>
          <button
            onClick={() => demoAction("Gọi đường dây nóng")}
            className="rounded-full px-3.5 py-1.5 text-xs font-bold text-white shadow-sm"
            style={{ background: theme.primary }}
          >
            Gọi ngay
          </button>
        </Card>
      </div>

      <div className="mt-5">
        <SectionTitle
          title="📰 Bản tin điều hành & Thông báo"
          action="Xem tất cả"
          onAction={() => navigate(path("/news"))}
        />
        <div className="mt-3 space-y-2 px-4">
          {news.slice(0, 3).map((n) => (
            <NewsRow key={n.id} item={n} />
          ))}
        </div>
      </div>

      <div className="mt-5">
        <ZaloOACard
          name={`OA ${AGENCY}`}
          subtitle="Quan tâm để nhận thông báo kết quả giải quyết hồ sơ qua Zalo"
          logo="🏛️"
        />
      </div>
    </TplPage>
  );
}
