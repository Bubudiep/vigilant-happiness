import { AccountPage } from "../../_shared/kit";

export default function Account() {
  return (
    <AccountPage
      userName="Mẹ bé Na"
      card={{ label: "Bé Yêu Club", tier: "Hạng Kim Cương", value: "5.200 điểm", progress: 0.86, note: "Tích điểm x2 khi mua bỉm sữa tuần này" }}
      shortcutsTitle="Đơn hàng"
      shortcuts={[
        { emoji: "🧾", label: "Chờ xác nhận" },
        { emoji: "📦", label: "Đang giao" },
        { emoji: "✅", label: "Đã nhận" },
        { emoji: "🔁", label: "Mua lại" },
      ]}
      menu={[
        { emoji: "👶", label: "Hồ sơ của bé", note: "Bé Na" },
        { emoji: "📈", label: "Theo dõi cân nặng, chiều cao" },
        { emoji: "💉", label: "Lịch tiêm chủng" },
        { emoji: "🎟️", label: "Voucher", note: "3 mã" },
        { emoji: "💬", label: "Tư vấn dinh dưỡng" },
      ]}
    />
  );
}
