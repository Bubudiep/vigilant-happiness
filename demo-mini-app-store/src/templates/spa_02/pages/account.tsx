import { AccountPage } from "../../_shared/kit";

export default function Account() {
  return (
    <AccountPage
      referral={{ offer: "tặng 1 buổi gội dưỡng sinh", reward: "Bạn nhận 100.000đ vào ví khi bạn bè mua gói liệu trình", code: "ANNHIEN" }}
      card={{ label: "An Nhiên Member", tier: "Hạng Ngọc", value: "Ví: 2.000.000đ", progress: 0.6, note: "Còn 4 buổi trong gói Gội dưỡng sinh 10 buổi" }}
      shortcutsTitle="Gói & ví"
      shortcuts={[
        { emoji: "📦", label: "Liệu trình" },
        { emoji: "💳", label: "Nạp ví" },
        { emoji: "🎟️", label: "Voucher" },
        { emoji: "⭐", label: "Đánh giá" },
      ]}
      menu={[
        { emoji: "📋", label: "Hồ sơ sức khoẻ & làn da" },
        { emoji: "🏬", label: "Hệ thống chi nhánh" },
        { emoji: "👭", label: "Giới thiệu bạn bè", note: "+100K" },
        { emoji: "💬", label: "Tư vấn qua Zalo" },
      ]}
    />
  );
}
