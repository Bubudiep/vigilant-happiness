import { AccountPage } from "../../_shared/kit";

export default function Account() {
  return (
    <AccountPage
      referral={{ offer: "giảm 10% phí dịch vụ", reward: "Áp dụng cho hồ sơ đầu tiên của người được giới thiệu", code: "TAMDUC10" }}
      title="Hồ sơ khách hàng"
      userName="Trần Quốc Tuấn"
      userNote="Khách hàng VIP · Môi giới & Đầu tư BĐS"
      card={{
        label: "Thẻ Đối Tác Công Chứng",
        tier: "Ưu tiên Phòng VIP",
        value: "12 hồ sơ đã ký",
        progress: 0.8,
        note: "Miễn phí lưu trữ bản sao điện tử & hỗ trợ soạn thảo trước qua Zalo",
      }}
      shortcutsTitle="Tiện ích công chứng"
      shortcuts={[
        { emoji: "📸", label: "Gửi ảnh sổ" },
        { emoji: "📄", label: "Dự thảo HĐ" },
        { emoji: "🧮", label: "Tính phí" },
        { emoji: "🏡", label: "Ký tận nơi" },
      ]}
      menu={[
        { emoji: "🪪", label: "Thông tin CCCD đã lưu sẵn", note: "2 người" },
        { emoji: "📑", label: "Lịch sử hợp đồng đã công chứng", note: "12 văn bản" },
        { emoji: "🏛️", label: "Đăng ký đối tác Ngân hàng / Sàn BĐS" },
        { emoji: "💬", label: "Nhắn trực tiếp Thư ký nghiệp vụ" },
        { emoji: "📍", label: "Chỉ đường & chỗ đỗ ô tô tại VP" },
      ]}
    />
  );
}
