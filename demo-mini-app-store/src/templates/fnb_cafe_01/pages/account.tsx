import { AccountPage } from "../../_shared/kit";

export default function Account() {
  return (
    <AccountPage
      referral={{ offer: "1 ly size M", reward: "Bạn nhận 1 tem khi bạn bè đặt ly đầu tiên", code: "MOC2026" }}
      card={{
        label: "Mộc Rewards",
        tier: "Hạng Đồng",
        value: "320 điểm",
        progress: 0.32,
        note: "Còn 680 điểm để lên hạng Bạc",
        background: "linear-gradient(180deg, #c98b4f 0%, #924800 100%)",
      }}
      shortcutsTitle="Đơn của tôi"
      shortcuts={[
        { emoji: "🧾", label: "Đang làm" },
        { emoji: "🛵", label: "Đang giao" },
        { emoji: "✅", label: "Hoàn thành" },
        { emoji: "⭐", label: "Đánh giá" },
      ]}
      menu={[
        { emoji: "🎟️", label: "Voucher của tôi", note: "2 mã" },
        { emoji: "📍", label: "Địa chỉ giao hàng" },
        { emoji: "🏪", label: "Cửa hàng gần bạn" },
        { emoji: "💬", label: "Góp ý cho quán" },
      ]}
    />
  );
}
