import { useNavigate } from "zmp-ui";

import {
  BannerSwiper,
  BrandHeader,
  Card,
  formatPrice,
  MemberCard,
  SectionTitle,
  ShortcutGrid,
  TplPage,
  useDemoAction,
  useTplTheme,
} from "../../_shared/kit";
import { LiveSession, statusStyle } from "../components";
import { MY_TABLE, path, SESSION_START, tables, tableTypes } from "../data";

export default function HomePage() {
  const navigate = useNavigate();
  const demoAction = useDemoAction();
  const theme = useTplTheme();
  const counts = { free: 0, playing: 0, reserved: 0 };
  tables.forEach((t) => counts[t.status]++);

  return (
    <TplPage tab>
      <BrandHeader
        logo="🎱"
        name="Cơ Thủ Billiards Club"
        subtitle="Mở cửa 9:00 – 2:00 · 13 bàn chuẩn thi đấu quốc tế"
        variant="solid"
      />

      <div className="px-4 pt-3">
        <LiveSession
          table={MY_TABLE}
          start={SESSION_START}
          onOrder={() => navigate(path("/menu"))}
          onPay={() => demoAction("Thanh toán giờ chơi & đồ uống tại bàn")}
        />
      </div>

      <BannerSwiper
        variant="split"
        banners={[
          {
            eyebrow: "HAPPY HOUR 9:00 – 15:00",
            title: "Giảm 30% tiền giờ",
            subtitle: "Áp dụng bàn Pool & Carom · Tặng trà đá miễn phí",
            from: theme.primary,
            to: "#047857",
            emoji: "🎱",
            cta: "Đặt bàn ngay",
            onClick: () => navigate(path("/tables")),
          },
          {
            eyebrow: "GIẢI ĐẤU CUỐI TUẦN",
            title: "Cơ Thủ Mở Rộng",
            subtitle: "Tổng giải thưởng 15.000.000đ · Đăng ký trực tuyến",
            from: "#1e293b",
            to: "#b45309",
            emoji: "🏆",
            cta: "Đăng ký thi đấu",
            onClick: () => demoAction("Đăng ký giải đấu Cơ Thủ Mở Rộng"),
          },
        ]}
      />

      <div className="px-4 pt-3">
        <Card className="!p-3.5" onClick={() => navigate(path("/tables"))}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold">🟢 Sơ đồ bàn thời gian thực</span>
            <span className="text-xs font-semibold" style={{ color: theme.primary }}>
              Chọn bàn ›
            </span>
          </div>
          <div className="mt-2.5 grid grid-cols-3 gap-2 text-center">
            {(Object.keys(counts) as (keyof typeof counts)[]).map((k) => (
              <div
                key={k}
                className="rounded-xl py-2"
                style={{ background: statusStyle[k].bg, color: statusStyle[k].fg }}
              >
                <div className="text-xl font-extrabold">{counts[k]}</div>
                <div className="text-[11px] font-medium">{statusStyle[k].label}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-4">
        <ShortcutGrid
          variant="card"
          cols={4}
          items={[
            { emoji: "📅", label: "Đặt bàn", badge: "Live", onClick: () => navigate(path("/tables")) },
            { emoji: "🍺", label: "Gọi đồ", onClick: () => navigate(path("/menu")) },
            { emoji: "🏆", label: "Giải đấu", onClick: () => demoAction("Đăng ký giải đấu") },
            { emoji: "🎓", label: "Lớp học cơ", onClick: () => demoAction("Lớp học bida cơ bản & nâng cao") },
          ]}
        />
      </div>

      <div className="mt-4">
        <MemberCard
          variant="vip"
          tier="Cơ Thủ Hạng Vàng"
          points="Tích lũy: 42 giờ chơi"
          subtitle="Giảm 15% giờ chơi mọi khung giờ & miễn phí giữ cơ riêng"
          progress={0.7}
          onClick={() => navigate(path("/account"))}
        />
      </div>

      <div className="mt-5">
        <SectionTitle title="💎 Bảng giá giờ chơi" subtitle="Tính tiền chính xác theo từng phút" />
        <div className="mx-4 mt-3 divide-y divide-gray-100 rounded-2xl border border-gray-200/80 bg-white shadow-sm">
          {tableTypes.map((t) => (
            <div key={t.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <div>
                <div className="font-semibold">{t.label}</div>
                <div className="text-[11px] text-gray-500">{t.note}</div>
              </div>
              <div className="font-extrabold" style={{ color: theme.primary }}>
                {formatPrice(t.pricePerHour)}
                <span className="text-xs font-normal text-gray-400">/giờ</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </TplPage>
  );
}
