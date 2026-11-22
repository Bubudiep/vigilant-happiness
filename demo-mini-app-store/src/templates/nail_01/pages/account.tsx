import { AccountPage } from "../../_shared/kit";

export default function Account() {
  return (
    <AccountPage
      referral={{ offer: "giảm 20% lần làm đầu", reward: "Bạn nhận 50 điểm khi bạn bè hoàn thành lần làm đầu", code: "MAYNAIL20" }}
      card={{ label: "Mây Member", tier: "Hạng Hồng", value: "420 điểm", progress: 0.42, note: "Thêm 580 điểm để lên hạng Kim cương (giảm 10% mọi dịch vụ)" }}
      shortcutsTitle="Tiện ích"
      shortcuts={[
        { emoji: "🎨", label: "Mẫu đã làm" },
        { emoji: "🎟️", label: "Voucher" },
        { emoji: "🎁", label: "Đổi điểm" },
        { emoji: "⭐", label: "Đánh giá" },
      ]}
      menu={[
        { emoji: "💅", label: "Màu sơn yêu thích" },
        { emoji: "🧴", label: "Sản phẩm dưỡng móng" },
        { emoji: "👭", label: "Giới thiệu bạn bè", note: "+50 điểm" },
        { emoji: "💬", label: "Gửi mẫu nail qua Zalo" },
      ]}
    />
  );
}
