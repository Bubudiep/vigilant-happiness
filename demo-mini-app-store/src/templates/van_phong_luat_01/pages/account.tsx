import { AccountPage } from "../../_shared/kit";

export default function Account() {
  return (
    <AccountPage
      referral={{ offer: "30 phút tư vấn miễn phí", reward: "Người được giới thiệu được tư vấn sơ bộ miễn phí", code: "LUAT30" }}
      title="Hồ sơ Thân chủ"
      userName="Lê Hoàng Nam"
      userNote="Khách hàng Doanh nghiệp & Cá nhân"
      card={{
        label: "Thẻ Luật Sư Gia Đình & DN",
        tier: "Gói Bảo Trợ Pháp Lý",
        value: "Còn 4 giờ tư vấn 1-1",
        progress: 0.75,
        note: "Hỗ trợ rà soát hợp đồng & đường dây nóng Luật sư 24/7",
      }}
      shortcutsTitle="Tài liệu pháp lý"
      shortcuts={[
        { emoji: "📑", label: "Hợp đồng mẫu" },
        { emoji: "✍️", label: "Đơn từ đã soạn" },
        { emoji: "🎥", label: "Lịch sử tư vấn" },
        { emoji: "🧾", label: "Hoá đơn VAT" },
      ]}
      menu={[
        { emoji: "🛡️", label: "Cam kết bảo mật thông tin (NDA)", note: "Đã ký" },
        { emoji: "📂", label: "Kho hồ sơ & chứng cứ đã tải lên", note: "8 tệp" },
        { emoji: "🏢", label: "Dịch vụ Phòng Pháp chế thuê ngoài" },
        { emoji: "💬", label: "Liên hệ Trợ lý Luật sư phụ trách" },
        { emoji: "📍", label: "Địa chỉ Văn phòng Luật Minh Chính" },
      ]}
    />
  );
}
