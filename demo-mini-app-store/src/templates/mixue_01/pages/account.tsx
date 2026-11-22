import { AccountPage } from "../../_shared/kit";

export default function Account() {
  return (
    <AccountPage
      referral={{ offer: "1 kem ốc quế", reward: "Bạn nhận 1 ly trà chanh khi bạn bè đặt đơn đầu tiên", code: "MIXUE10K" }}
      card={{
        label: "Mixue Member",
        tier: "Hạng Đồng",
        value: "320 điểm",
        progress: 0.32,
        note: "Còn 680 điểm để lên hạng Bạc",
        background: "linear-gradient(180deg, #ff4d4f 0%, #c4000f 100%)",
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
        { emoji: "💬", label: "Góp ý cho cửa hàng" },
      ]}
    />
  );
}
