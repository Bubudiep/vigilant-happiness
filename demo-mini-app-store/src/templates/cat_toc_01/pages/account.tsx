import { AccountPage } from "../../_shared/kit";

export default function Account() {
  return (
    <AccountPage
      referral={{ offer: "giảm 30K lần cắt đầu", reward: "Bạn được cắt miễn phí 1 lần khi giới thiệu đủ 3 bạn", code: "GENTLE30" }}
      card={{ label: "Thẻ Quý ông", tier: "Hạng Bạc", value: "Đã cắt 7/10 lần", progress: 0.7, note: "Cắt thêm 3 lần nữa được tặng 1 lần cắt miễn phí" }}
      shortcutsTitle="Tiện ích"
      shortcuts={[
        { emoji: "🎫", label: "Số xếp hàng" },
        { emoji: "💳", label: "Thẻ trả trước" },
        { emoji: "🎟️", label: "Voucher" },
        { emoji: "⭐", label: "Đánh giá thợ" },
      ]}
      menu={[
        { emoji: "💇‍♂️", label: "Kiểu tóc đã cắt" },
        { emoji: "🧴", label: "Sáp & dầu gội đã mua" },
        { emoji: "👬", label: "Giới thiệu bạn bè", note: "+30K" },
        { emoji: "💬", label: "Nhắn tiệm qua Zalo" },
      ]}
    />
  );
}
