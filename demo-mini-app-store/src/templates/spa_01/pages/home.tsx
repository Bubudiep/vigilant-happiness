import { useNavigate } from "zmp-ui";

import {
  BannerSwiper,
  BrandHeader,
  MemberCard,
  SearchBox,
  SectionTitle,
  ShortcutGrid,
  SmartIcon,
  TplPage,
  useDemoAction,
} from "../../_shared/kit";
import { ServiceRow } from "../components";
import { banners, path, services, staff } from "../data";

export default function HomePage() {
  const navigate = useNavigate();
  const demoAction = useDemoAction();

  return (
    <TplPage tab>
      <BrandHeader logo="🪷" name="Lotus Spa & Beauty" subtitle="Thư giãn mỗi ngày" variant="pastel">
        <SearchBox placeholder="Tìm liệu trình: massage, chăm sóc da..." onClick={() => navigate(path("/services"))} />
      </BrandHeader>

      <BannerSwiper
        banners={banners.map((b) => ({
          ...b,
          cta: "Đặt lịch",
          onClick: () => navigate(path("/services")),
        }))}
      />

      <div className="mt-3">
        <ShortcutGrid
          cols={4}
          items={[
            { emoji: "📅", label: "Đặt lịch", onClick: () => navigate(path("/services")) },
            { emoji: "💆", label: "Liệu trình", onClick: () => navigate(path("/services")) },
            { emoji: "🎁", label: "Ưu đãi", onClick: () => demoAction("Ưu đãi tháng này") },
            { emoji: "📍", label: "Chi nhánh", onClick: () => demoAction("Hệ thống chi nhánh") },
          ]}
        />
      </div>

      <div className="mt-3">
        <MemberCard
          tier="Hạng Vàng"
          points="Còn 4 buổi liệu trình"
          subtitle="Ưu tiên phòng riêng & miễn phí xông thảo dược"
          onClick={() => navigate(path("/account"))}
        />
      </div>

      <div className="mt-4">
        <SectionTitle
          title="Dịch vụ nổi bật"
          action="Xem tất cả"
          onAction={() => navigate(path("/services"))}
        />
        <div className="mt-2.5 space-y-2.5 px-4">
          {services
            .filter((s) => s.hot)
            .map((s) => (
              <ServiceRow key={s.id} service={s} />
            ))}
        </div>
      </div>

      <div className="mt-4">
        <SectionTitle title="Kỹ thuật viên" />
        <div className="no-scrollbar mt-2.5 flex gap-3 overflow-x-auto px-4">
          {staff.slice(1).map((s) => (
            <div
              key={s.id}
              onClick={() => navigate(path("/services"))}
              className="flex w-28 shrink-0 cursor-pointer flex-col items-center rounded-2xl border border-gray-200/80 bg-white p-3 shadow-sm"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                <SmartIcon token={s.emoji} size={22} />
              </span>
              <div className="mt-1.5 text-xs font-bold">{s.name}</div>
              <div className="text-[11px] text-gray-500">{s.title}</div>
            </div>
          ))}
        </div>
      </div>
    </TplPage>
  );
}
