import { AccountPage } from "../../_shared/kit";

export default function Account() {
  return (
    <AccountPage
      referral={{ offer: "1 giờ chơi miễn phí", reward: "Bạn nhận thêm 1 giờ khi bạn bè chơi lần đầu", code: "COTHU26" }}
      card={{ label: "Hội viên Cơ Thủ", tier: "Hạng Vàng", value: "32 giờ chơi", progress: 0.64, note: "Tích đủ 50 giờ: tặng 5 giờ chơi miễn phí" }}
      shortcutsTitle="Thống kê của bạn"
      shortcuts={[
        { emoji: "⏱️", label: "Giờ chơi" },
        { emoji: "🏆", label: "Giải đã dự" },
        { emoji: "🧾", label: "Hoá đơn" },
        { emoji: "👥", label: "Hội bạn chơi" },
      ]}
      menu={[
        { emoji: "💳", label: "Nạp tiền tài khoản", note: "Tặng 10%" },
        { emoji: "🎱", label: "Gửi cơ cá nhân tại quán" },
        { emoji: "🎟️", label: "Voucher", note: "2 mã" },
        { emoji: "💬", label: "Liên hệ quán" },
      ]}
    />
  );
}
