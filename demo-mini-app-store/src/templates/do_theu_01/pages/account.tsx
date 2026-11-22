import { AccountPage } from "../../_shared/kit";

export default function Account() {
  return (
    <AccountPage
      card={{ label: "Khách quen Thêu Xinh", tier: "Hạng Bạc", value: "3 đơn đã hoàn thành", progress: 0.6, note: "Đơn thứ 5 được tặng thêu hoạ tiết miễn phí" }}
      menu={[
        { emoji: "🧵", label: "Mẫu đã lưu" },
        { emoji: "🖼️", label: "Thiết kế của tôi" },
        { emoji: "📍", label: "Địa chỉ nhận hàng" },
        { emoji: "🎟️", label: "Voucher", note: "1 mã" },
        { emoji: "💬", label: "Nhắn tiệm" },
      ]}
    />
  );
}
