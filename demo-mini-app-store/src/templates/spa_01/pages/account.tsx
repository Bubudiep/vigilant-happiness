import { AccountPage } from "../../_shared/kit";

export default function Account() {
  return (
    <AccountPage
      referral={{ offer: "giảm 30% liệu trình đầu", reward: "Bạn nhận 100.000đ vào ví khi bạn bè hoàn thành liệu trình", code: "LOTUS30" }}
      card={{ label: "Lotus Member", tier: "Hạng Vàng", value: "Ví: 1.500.000đ", progress: 0.7, note: "Còn 3 buổi trong gói Chăm sóc da 10 buổi" }}
      shortcutsTitle="Gói & thẻ"
      shortcuts={[
        { emoji: "💳", label: "Thẻ trả trước" },
        { emoji: "📦", label: "Gói liệu trình" },
        { emoji: "🎟️", label: "Voucher" },
        { emoji: "⭐", label: "Đánh giá" },
      ]}
      menu={[
        { emoji: "📋", label: "Hồ sơ làn da" },
        { emoji: "🏬", label: "Hệ thống chi nhánh" },
        { emoji: "👭", label: "Giới thiệu bạn bè", note: "+100K" },
        { emoji: "💬", label: "Liên hệ tư vấn" },
      ]}
    />
  );
}
