import { AccountPage } from "../../_shared/kit";

export default function Account() {
  return (
    <AccountPage
      referral={{ offer: "gói khám tổng quát giảm 15%", reward: "Bạn nhận 100 điểm khi bạn bè đến khám lần đầu", code: "ANKHANG15" }}
      title="Hồ sơ"
      userName="Bệnh nhân demo"
      userNote="Mã BN: AK-102938"
      card={{ label: "Gói khám sức khoẻ", tier: "Gói Gia đình", value: "Còn 3/4 lượt", progress: 0.75, note: "Hạn sử dụng đến 31/12/2026" }}
      shortcutsTitle="Hồ sơ sức khoẻ"
      shortcuts={[
        { emoji: "🧾", label: "Kết quả XN" },
        { emoji: "💊", label: "Đơn thuốc" },
        { emoji: "📈", label: "Chỉ số" },
        { emoji: "👨‍👩‍👧", label: "Người thân" },
      ]}
      menu={[
        { emoji: "🪪", label: "Thẻ BHYT", note: "Đã liên kết" },
        { emoji: "🔔", label: "Nhắc lịch uống thuốc" },
        { emoji: "💳", label: "Lịch sử thanh toán" },
        { emoji: "☎️", label: "Tổng đài hỗ trợ" },
      ]}
    />
  );
}
