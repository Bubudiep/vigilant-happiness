import { AccountPage } from "../../_shared/kit";

export default function Account() {
  return (
    <AccountPage
      card={{ label: "Xiêm Y Member", tier: "Hạng Đồng", value: "4 lần thuê", progress: 0.4, note: "Thuê thêm 6 lần để được miễn cọc" }}
      menu={[
        { emoji: "❤️", label: "Trang phục yêu thích" },
        { emoji: "📏", label: "Số đo của tôi", note: "M · 160cm" },
        { emoji: "💵", label: "Tiền cọc đang giữ", note: "0đ" },
        { emoji: "🎟️", label: "Voucher", note: "1 mã" },
        { emoji: "💬", label: "Nhắn tiệm" },
      ]}
    />
  );
}
