import { AccountPage } from "../../_shared/kit";

export default function Account() {
  return (
    <AccountPage
      referral={{ offer: "quà tân gia 2 triệu", reward: "Nhận hoa hồng giới thiệu khi bạn bè đặt cọc thành công", code: "ANCU2026" }}
      shortcutsTitle="Hoạt động của tôi"
      shortcuts={[
        { emoji: "📅", label: "Lịch xem nhà" },
        { emoji: "📝", label: "Phiếu giữ chỗ" },
        { emoji: "🧮", label: "Khoản vay" },
        { emoji: "🔔", label: "Thông báo giá" },
      ]}
      menu={[
        { emoji: "🏠", label: "Tin ký gửi của tôi" },
        { emoji: "📄", label: "Hồ sơ pháp lý" },
        { emoji: "👔", label: "Chuyên viên phụ trách", note: "Anh Tuấn" },
        { emoji: "💬", label: "Hỗ trợ" },
      ]}
    />
  );
}
