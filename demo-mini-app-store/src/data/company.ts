/**
 * Thông tin Công ty T — hiển thị ở trang chủ (Showcase).
 * TODO(ND-01, ND-02, ND-04, ND-05, ND-06): thay bằng thông tin thật.
 */

export const company = {
  name: "reMini",
  owner: "Hộ kinh doanh A",
  shortName: "re",
  slogan: "Thiết kế Zalo Mini App cho doanh nghiệp của bạn",
  description:
    "reMini (thuộc Hộ kinh doanh A) thiết kế và triển khai Zalo Mini App trọn gói: bán hàng, đặt lịch, tích điểm thành viên, chăm sóc khách hàng ngay trên Zalo.",
  phone: "0900000000",
  phoneDisplay: "0900 000 000",
  email: "lienhe@remini.vn",
  website: "remini.vn",
  address: "123 Đường ABC, Quận 1, TP. Hồ Chí Minh",
  workingHours: "8:00 – 18:00, Thứ 2 – Thứ 7",
  /** ID Zalo Official Account — để trống thì nút Chat OA sẽ gọi điện thay thế */
  zaloOaId: "",
  /** Ảnh dùng khi chia sẻ Mini App (bắt buộc với openShareSheet) */
  // TODO: thay bằng URL ảnh thật (https) của reMini
  shareThumbnail: "",
};

export const stats = [
  { value: "50+", label: "Mini App đã triển khai" },
  { value: "10+", label: "Ngành nghề" },
  { value: "7 ngày", label: "Triển khai nhanh nhất" },
  { value: "24/7", label: "Hỗ trợ kỹ thuật" },
];

export const steps = [
  { title: "Chọn mẫu", text: "Xem các mẫu demo theo ngành phù hợp với bạn." },
  { title: "Trải nghiệm", text: "Bấm vào mẫu để dùng thử như một Mini App thật." },
  { title: "Tuỳ biến & triển khai", text: "Chúng tôi chỉnh theo thương hiệu và đưa lên Zalo." },
];

export const offers = [
  {
    badge: "Ưu đãi tháng này",
    title: "Giảm 20% phí thiết kế",
    text: "Áp dụng cho khách hàng ký hợp đồng trước 31/12.",
  },
  {
    badge: "Quà tặng",
    title: "Miễn phí 3 tháng bảo trì",
    text: "Tặng kèm khi chọn gói Tiêu chuẩn trở lên.",
  },
];

export const pricing = [
  {
    name: "Cơ bản",
    price: "Liên hệ",
    features: ["Dùng mẫu có sẵn", "Đổi logo, màu sắc", "Hỗ trợ đăng ký Mini App"],
  },
  {
    name: "Tiêu chuẩn",
    price: "Liên hệ",
    highlight: true,
    features: ["Tuỳ biến giao diện", "Quản lý sản phẩm / dịch vụ", "Tích hợp Zalo OA", "Bảo trì 3 tháng"],
  },
  {
    name: "Nâng cao",
    price: "Liên hệ",
    features: ["Thiết kế riêng theo yêu cầu", "Kết nối hệ thống sẵn có", "Thanh toán online", "Báo cáo thống kê"],
  },
];

export const clients = [
  { name: "Cửa hàng A", industry: "Thời trang", quote: "Khách đặt hàng qua Zalo tiện hơn hẳn, đơn tăng rõ rệt." },
  { name: "Quán cà phê B", industry: "F&B", quote: "Triển khai nhanh, nhân viên dùng được ngay." },
  { name: "Spa C", industry: "Spa / Salon", quote: "Khách tự đặt lịch, giảm hẳn cuộc gọi hỏi lịch trống." },
];
