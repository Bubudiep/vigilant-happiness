import { AccountPage } from "../../_shared/kit";

export default function Account() {
  return (
    <AccountPage
      card={{ label: "Thẻ thân thiết", tier: "Hạng Bạc", value: "860 điểm", progress: 0.43, note: "Mỗi 10.000đ = 1 điểm · 1.000 điểm đổi 1 lẩu" }}
      menu={[
        { emoji: "🧾", label: "Lịch sử gọi món" },
        { emoji: "🎟️", label: "Voucher của tôi", note: "1 mã" },
        { emoji: "🎂", label: "Ưu đãi sinh nhật" },
        { emoji: "⭐", label: "Đánh giá nhà hàng" },
        { emoji: "💬", label: "Liên hệ" },
      ]}
    />
  );
}
