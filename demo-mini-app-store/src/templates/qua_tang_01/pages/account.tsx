import { AccountPage } from "../../_shared/kit";

export default function Account() {
  return (
    <AccountPage
      card={{ label: "Thành viên Hộp Quà Xinh", tier: "Hạng Bạc", value: "640 điểm", progress: 0.64, note: "Còn 360 điểm nhận gói quà luxury miễn phí" }}
      shortcutsTitle="Đơn quà"
      shortcuts={[
        { emoji: "🧾", label: "Chờ xác nhận" },
        { emoji: "🎀", label: "Đang gói" },
        { emoji: "🛵", label: "Đang giao" },
        { emoji: "📸", label: "Ảnh giao quà" },
      ]}
      menu={[
        { emoji: "📅", label: "Nhắc ngày đặc biệt", note: "3 ngày" },
        { emoji: "👥", label: "Sổ người nhận quà" },
        { emoji: "🎟️", label: "Voucher", note: "2 mã" },
        { emoji: "💬", label: "Tư vấn chọn quà" },
      ]}
    />
  );
}
