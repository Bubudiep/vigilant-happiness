import { useAtomValue } from "jotai";
import { useNavigate } from "zmp-ui";

import {
  BannerSwiper,
  BookingCard,
  BrandHeader,
  Card,
  formatPrice,
  SearchBox,
  SectionTitle,
  ShortcutGrid,
  TplPage,
  useTplTheme,
} from "../../_shared/kit";
import { LawyerCard } from "../components";
import { consultationsAtom, fixedServices, lawyers, path, practiceAreas } from "../data";

export default function HomePage() {
  const navigate = useNavigate();
  const theme = useTplTheme();
  const nextConsult = useAtomValue(consultationsAtom).find((c) => c.status === "upcoming");

  return (
    <TplPage tab>
      <BrandHeader
        logo="🏛️"
        name="Luật Minh Chính"
        subtitle="Tư vấn pháp lý & Tranh tụng"
        variant="solid"
      >
        <SearchBox
          placeholder="Tìm luật sư, lĩnh vực: đất đai, hôn nhân, hợp đồng..."
          onClick={() => navigate(path("/lawyers"))}
        />
      </BrandHeader>

      <BannerSwiper
        banners={[
          {
            eyebrow: "Tư vấn 1-1 bảo mật",
            title: "Đặt lịch làm việc cùng Luật sư",
            subtitle: "Tư vấn qua Video Zalo hoặc trực tiếp tại Văn phòng",
            from: "#1c1917",
            to: "#78350f",
            emoji: "🏛️",
            cta: "Chọn Luật sư",
            onClick: () => navigate(path("/lawyers")),
          },
          {
            eyebrow: "Soạn thảo văn bản",
            title: "Soạn đơn khởi kiện & Hợp đồng",
            subtitle: "Hoàn thành trong 24 giờ · Đảm bảo chặt chẽ pháp lý",
            from: "#292524",
            to: "#b45309",
            emoji: "✍️",
            cta: "Gửi yêu cầu",
            onClick: () => navigate(path("/book/ls1")),
          },
        ]}
      />

      <div className="mt-3">
        <ShortcutGrid
          cols={4}
          items={practiceAreas.slice(1, 5).map((a) => ({
            emoji: a.emoji,
            label: a.label.split("&")[0].trim(),
            onClick: () => navigate(path(`/lawyers?area=${a.id}`)),
          }))}
        />
      </div>

      {nextConsult && (
        <div className="mt-3 px-4">
          <BookingCard booking={nextConsult} onClick={() => navigate(path("/cases"))} />
        </div>
      )}

      <div className="mt-4">
        <SectionTitle
          title="Đội ngũ Luật sư"
          action="Xem tất cả"
          onAction={() => navigate(path("/lawyers"))}
        />
        <div className="mt-2.5 space-y-2.5 px-4">
          {lawyers
            .filter((l) => l.featured)
            .map((l) => (
              <LawyerCard key={l.id} lawyer={l} />
            ))}
        </div>
      </div>

      <div className="mt-4">
        <SectionTitle title="Biểu phí dịch vụ niêm yết" />
        <div className="mt-2.5 space-y-2 px-4">
          {fixedServices.map((s) => (
            <Card
              key={s.id}
              className="flex items-center justify-between gap-3 !p-3"
              onClick={() => navigate(path("/book/ls1"))}
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-gray-900">{s.name}</div>
                <div className="text-xs text-gray-500">Thời gian: {s.time}</div>
              </div>
              <div className="text-sm font-bold" style={{ color: theme.accent }}>
                {formatPrice(s.price)}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </TplPage>
  );
}
