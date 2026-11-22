import { useAtomValue } from "jotai";
import { useNavigate } from "zmp-ui";

import {
  BannerSwiper,
  BookingCard,
  BrandHeader,
  Card,
  MemberCard,
  SearchBox,
  SectionTitle,
  ShortcutGrid,
  TplPage,
  useDemoAction,
  ZaloOACard,
} from "../../_shared/kit";
import { DoctorCard } from "../components";
import { appointmentsAtom, doctors, path, specialties, tips } from "../data";

export default function HomePage() {
  const navigate = useNavigate();
  const demoAction = useDemoAction();
  const next = useAtomValue(appointmentsAtom).find((a) => a.status === "upcoming");

  return (
    <TplPage tab>
      <BrandHeader logo="🏥" name="An Khang Clinic" subtitle="Đặt lịch khám nhanh – Không chờ đợi" variant="pastel">
        <SearchBox placeholder="Tìm bác sĩ, chuyên khoa, gói khám..." onClick={() => navigate(path("/doctors"))} />
      </BrandHeader>

      <BannerSwiper
        variant="split"
        banners={[
          {
            eyebrow: "Khám sức khoẻ tổng quát",
            title: "Đặt lịch khám online",
            subtitle: "Chọn bác sĩ, chọn giờ – đến là khám ngay",
            from: "#0284c7",
            to: "#0d9488",
            emoji: "🩺",
            cta: "Đặt lịch ngay",
            onClick: () => navigate(path("/doctors")),
          },
          {
            eyebrow: "Ưu đãi gia đình",
            title: "Gói tầm soát định kỳ",
            subtitle: "Giảm 20% khi đăng ký từ 2 người",
            from: "#0f766e",
            to: "#2dd4bf",
            emoji: "💙",
            cta: "Xem gói khám",
            onClick: () => navigate(path("/doctors")),
          },
        ]}
      />

      {next && (
        <div className="mt-4 space-y-2 px-4">
          <div className="text-xs font-bold uppercase tracking-wider text-sky-700">📅 Lịch khám sắp tới</div>
          <BookingCard booking={next} onClick={() => navigate(path("/appointments"))} />
        </div>
      )}

      <div className="mt-4">
        <ShortcutGrid
          variant="card"
          cols={4}
          items={[
            { emoji: "📅", label: "Đặt lịch", badge: "24/7", onClick: () => navigate(path("/doctors")) },
            { emoji: "🧾", label: "Kết quả XN", onClick: () => demoAction("Tra cứu kết quả xét nghiệm") },
            { emoji: "💬", label: "Hỏi bác sĩ", onClick: () => demoAction("Hỏi đáp trực tuyến với bác sĩ") },
            { emoji: "💊", label: "Đơn thuốc", onClick: () => demoAction("Toa thuốc điện tử") },
            ...specialties.slice(1, 5).map((s) => ({
              emoji: s.emoji,
              label: s.label,
              onClick: () => navigate(path(`/doctors?sp=${s.id}`)),
            })),
          ]}
        />
      </div>

      <div className="mt-4">
        <MemberCard
          variant="minimal"
          tier="Thẻ Sức Khoẻ Gia Đình"
          points="Hồ sơ: 3 thành viên"
          subtitle="Lưu bệnh án điện tử & nhắc lịch tái khám tự động"
          onClick={() => navigate(path("/account"))}
        />
      </div>

      <div className="mt-5">
        <SectionTitle
          title="👨‍⚕️ Đội ngũ Bác sĩ Chuyên khoa"
          subtitle="Giàu kinh nghiệm từ các bệnh viện tuyến đầu"
          action="Xem tất cả"
          onAction={() => navigate(path("/doctors"))}
        />
        <div className="mt-3 space-y-2.5 px-4">
          {doctors.slice(0, 3).map((d) => (
            <DoctorCard key={d.id} doctor={d} />
          ))}
        </div>
      </div>

      <div className="mt-5">
        <ZaloOACard
          name="Phòng khám Đa khoa An Khang"
          subtitle="Quan tâm OA để nhận thông báo kết quả xét nghiệm qua Zalo"
          logo="🏥"
        />
      </div>

      <div className="mt-5">
        <SectionTitle title="📖 Cẩm nang sống khoẻ" />
        <div className="mt-3 space-y-2 px-4">
          {tips.map((t) => (
            <Card key={t.title} className="flex items-center gap-3 !p-3" onClick={() => demoAction("Bài viết sức khoẻ")}>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-xl">{t.emoji}</span>
              <span className="flex-1 text-sm font-medium">{t.title}</span>
              <span className="text-gray-300">›</span>
            </Card>
          ))}
        </div>
      </div>
    </TplPage>
  );
}
