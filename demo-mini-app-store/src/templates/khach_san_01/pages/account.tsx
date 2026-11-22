import { AccountPage } from "../../_shared/kit";

export default function Account() {
  return (
    <AccountPage
      referral={{ offer: "voucher 300K cho đêm đầu", reward: "Bạn nhận 500 điểm khi bạn bè hoàn tất kỳ nghỉ", code: "SEABREEZE" }}
      card={{ label: "Sea Breeze Rewards", tier: "Gold", value: "12 đêm", progress: 0.6, note: "Thêm 8 đêm để lên hạng Platinum" }}
      shortcutsTitle="Trong kỳ lưu trú"
      shortcuts={[
        { emoji: "🛎️", label: "Gọi lễ tân" },
        { emoji: "🍳", label: "Gọi đồ ăn" },
        { emoji: "🧺", label: "Giặt ủi" },
        { emoji: "🚕", label: "Gọi xe" },
      ]}
      menu={[
        { emoji: "🧾", label: "Hoá đơn" },
        { emoji: "🎟️", label: "Ưu đãi thành viên", note: "2" },
        { emoji: "❤️", label: "Phòng yêu thích" },
        { emoji: "💬", label: "Chat với lễ tân" },
      ]}
    />
  );
}
