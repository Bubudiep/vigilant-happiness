export type CategoryId =
  | "all"
  | "retail"
  | "fashion"
  | "fnb"
  | "health"
  | "mom_baby"
  | "spa"
  | "legal"
  | "enterprise"
  | "education"
  | "hotel"
  | "real_estate"
  | "gov"
  | "supermarket"
  | "entertainment";

export interface CategoryItem {
  id: CategoryId;
  label: string;
}

export const categories: CategoryItem[] = [
  { id: "all", label: "Tất cả" },
  { id: "fashion", label: "Thời trang" },
  { id: "fnb", label: "F&B" },
  { id: "retail", label: "Bán lẻ" },
  { id: "health", label: "Y tế / Siêu âm 5D" },
  { id: "legal", label: "Pháp lý / Công chứng" },
  { id: "enterprise", label: "Doanh nghiệp / KCN" },
  { id: "spa", label: "Spa / Salon" },
  { id: "mom_baby", label: "Mẹ & Bé" },
  { id: "supermarket", label: "Siêu thị" },
  { id: "education", label: "Giáo dục" },
  { id: "hotel", label: "Khách sạn" },
  { id: "real_estate", label: "Bất động sản" },
  { id: "gov", label: "Cơ quan" },
  { id: "entertainment", label: "Giải trí" },
];

export interface DemoTemplate {
  id: string;
  code: string;
  name: string;
  brand: string;
  description: string;
  categories: Exclude<CategoryId, "all">[];
  color: string;
  features: string[];
  featured?: boolean;
}

export const demoTemplates: DemoTemplate[] = [
  { id: "mixue_01", code: "T20", name: "Kem & Trà sữa", brand: "Mixue", description: "Mẫu đề xuất cho chuỗi kem & trà sữa: menu kem, trà sữa, trà chanh, tuỳ chọn size/đường/đá/topping, tích điểm.", categories: ["fnb"], color: "#e60012", features: ["Menu kem & trà", "Topping", "Tích điểm"], featured: true },
  { id: "thoi_trang_01", code: "T01", name: "Shop thời trang", brand: "LUMI Studio", description: "Bán hàng thời trang: danh mục, chọn màu/size, giỏ hàng, thẻ thành viên.", categories: ["fashion", "retail"], color: "#1f1f1f", features: ["Flash sale", "Chọn màu / size", "Thành viên"], featured: true },
  { id: "fnb_cafe_01", code: "T02", name: "Quán cà phê", brand: "Mộc Coffee", description: "Đặt món giao hàng hoặc lấy tại quán, tuỳ chọn size/đá/topping, tích tem.", categories: ["fnb"], color: "#6f4e37", features: ["Giao / Lấy tại quán", "Tuỳ chọn món", "Tích tem"], featured: true },
  { id: "sieu_am_5d_01", code: "T16", name: "Phòng khám Siêu âm 5D", brand: "BabySee 5D Clinic", description: "Theo dõi tuần thai, 8 mốc khám & xét nghiệm, lời nhắc hằng ngày, ảnh & video 5D.", categories: ["health", "mom_baby"], color: "#db2777", features: ["8 mốc xét nghiệm", "Theo dõi tuần thai", "Lời nhắc"], featured: true },
  { id: "cong_chung_01", code: "T17", name: "Văn phòng Công chứng", brand: "VPCC Tâm Đức", description: "Checklist giấy tờ, ước tính phí công chứng BĐS, đặt lịch ký tại VP hoặc tận nơi.", categories: ["legal", "real_estate", "gov"], color: "#1e3a8a", features: ["Checklist giấy tờ", "Tính phí tự động", "Ký tận nơi"], featured: true },
  { id: "van_phong_luat_01", code: "T18", name: "Văn phòng Luật sư", brand: "Luật Minh Chính", description: "Đặt lịch tư vấn Luật sư qua Video Zalo hoặc tại VP, theo dõi tiến độ hồ sơ.", categories: ["legal"], color: "#1c1917", features: ["Đặt lịch Luật sư", "Soạn đơn từ", "Tiến độ hồ sơ"], featured: true },
  { id: "kcn_doanh_nghiep_01", code: "T19", name: "Doanh nghiệp & Nhà máy KCN", brand: "VinaTech Industrial", description: "Check công & OT, nộp ảnh giấy tờ HR, đơn từ & báo cáo 5S, hòm thư ẩn danh.", categories: ["enterprise"], color: "#0f766e", features: ["Check bảng công", "Nộp ảnh giấy tờ", "Hòm thư ẩn danh"], featured: true },
  { id: "spa_01", code: "T03", name: "Spa / Salon", brand: "Lotus Spa", description: "Đặt lịch chăm sóc da, massage, chọn kỹ thuật viên và khung giờ.", categories: ["spa"], color: "#be185d", features: ["Đặt lịch hẹn", "Chọn KTV", "Liệu trình"] },
  { id: "fnb_nha_hang_01", code: "T04", name: "Nhà hàng", brand: "Bếp Quê Nhà", description: "Thực đơn món đặc sản, đặt bàn theo giờ & số lượng khách.", categories: ["fnb"], color: "#b45309", features: ["Thực đơn", "Đặt bàn", "Ưu đãi"] },
  { id: "sieu_thi_01", code: "T05", name: "Siêu thị mini", brand: "Xanh Mart", description: "Đi chợ online giao nhanh 2H, flash sale thực phẩm tươi sống.", categories: ["supermarket", "retail"], color: "#15803d", features: ["Giao nhanh 2H", "Flash sale", "Giỏ hàng"] },
  { id: "me_va_be_01", code: "T06", name: "Shop mẹ & bé", brand: "Bé Yêu Shop", description: "Gợi ý sữa, bỉm, đồ dùng theo độ tuổi của bé, cẩm nang nuôi con.", categories: ["mom_baby", "retail"], color: "#db2777", features: ["Hồ sơ bé", "Lọc độ tuổi", "Cẩm nang"] },
  { id: "phong_kham_01", code: "T07", name: "Phòng khám", brand: "An Khang Clinic", description: "Tìm bác sĩ theo chuyên khoa, đặt lịch khám nhanh không chờ đợi.", categories: ["health"], color: "#0284c7", features: ["Đặt lịch khám", "Chọn bác sĩ", "Hồ sơ"] },
  { id: "truong_hoc_01", code: "T08", name: "Trường học", brand: "THCS Ánh Sao", description: "Sổ liên lạc điện tử, thời khoá biểu, học phí và xin nghỉ phép.", categories: ["education"], color: "#4f46e5", features: ["Thời khoá biểu", "Học phí", "Xin nghỉ"] },
  { id: "khach_san_01", code: "T09", name: "Khách sạn / Resort", brand: "Sea Breeze Resort", description: "Đặt phòng nghỉ dưỡng, chọn ngày nhận/trả phòng và tiện ích.", categories: ["hotel"], color: "#0369a1", features: ["Tìm phòng", "Đặt phòng", "Tiện ích"] },
  { id: "bat_dong_san_01", code: "T10", name: "Bất động sản", brand: "An Cư Land", description: "Danh sách dự án, chi tiết căn hộ, đăng ký tham quan nhà mẫu.", categories: ["real_estate"], color: "#1e3a5f", features: ["Dự án hot", "Xem nhà mẫu", "Lưu dự án"] },
  { id: "co_quan_01", code: "T11", name: "UBND / Sở ban ngành", brand: "Cổng Dịch vụ công", description: "Tra cứu thủ tục hành chính, tin tức điều hành, phản ánh hiện trường.", categories: ["gov"], color: "#b91c1c", features: ["Thủ tục HC", "Phản ánh 24/7", "Tin tức"] },
  { id: "qua_tang_01", code: "T12", name: "Tiệm quà tặng", brand: "Hộp Quà Xinh", description: "Chọn quà theo dịp và người nhận, gói quà, viết thiệp.", categories: ["retail"], color: "#e11d48", features: ["Quà theo dịp", "Gói quà", "Viết thiệp"] },
  { id: "do_theu_01", code: "T13", name: "Order đồ thêu", brand: "Thêu Xinh Atelier", description: "Chọn phôi, nhập chữ, chọn màu chỉ, font – xem trước trực tiếp.", categories: ["retail", "fashion"], color: "#2a9d8f", features: ["Thêu theo yêu cầu", "Xem trước", "Tiến độ đơn"] },
  { id: "thue_trang_phuc_01", code: "T14", name: "Cho thuê trang phục", brand: "Xiêm Y Studio", description: "Áo dài, cổ phục, váy cưới – chọn size, ngày thuê, tính tiền cọc.", categories: ["fashion"], color: "#9a3412", features: ["Thuê theo ngày", "Tính cọc", "Lịch thuê"] },
  { id: "bida_01", code: "T15", name: "Quán bida", brand: "Cơ Thủ Billiards", description: "Sơ đồ bàn trống thời gian thực, đặt bàn theo giờ, gọi đồ lên bàn.", categories: ["entertainment", "fnb"], color: "#0b6e4f", features: ["Sơ đồ bàn", "Đặt bàn", "Gọi đồ lên bàn"] },
];

export const siteConfig = {
  brand: "recloud.vn",
  appName: "reMini",
  owner: "Hộ kinh doanh A",
  phone: "0900000000",
  phoneDisplay: "0900 000 000",
  email: "lienhe@recloud.vn",
  address: "123 Đường ABC, Quận 1, TP. Hồ Chí Minh",
  workingHours: "8:00 – 18:00 (Thứ 2 – Thứ 7)",
  zaloAppId: import.meta.env.VITE_ZALO_APP_ID || "3546317553033780315",
  zaloEnv: import.meta.env.VITE_ZALO_ENV || "TESTING",
  zaloVersion: import.meta.env.VITE_ZALO_VERSION || "10",
  apiUrl: import.meta.env.VITE_API_URL || "http://localhost:4000/api",
};

export function getZaloTemplateUrl(templateId?: string): string {
  const base = `https://zalo.me/s/${siteConfig.zaloAppId}/`;
  const params = new URLSearchParams();
  if (siteConfig.zaloEnv) params.set("env", siteConfig.zaloEnv);
  if (siteConfig.zaloVersion) params.set("version", siteConfig.zaloVersion);
  if (templateId) {
    params.set("mode", "Template");
    params.set("templateID", templateId);
  }
  return `${base}?${params.toString()}`;
}

/**
 * Link xem trước Mini App của một gian hàng (mở trong app reMini, đúng thiết kế Miniapp Studio + dữ liệu shop):
 * https://zalo.me/s/<appId>/?env=…&version=…&store=<slug>
 */
export function getZaloStoreUrl(slug: string): string {
  const params = new URLSearchParams();
  if (siteConfig.zaloEnv) params.set("env", siteConfig.zaloEnv);
  if (siteConfig.zaloVersion) params.set("version", siteConfig.zaloVersion);
  params.set("store", slug);
  return `https://zalo.me/s/${siteConfig.zaloAppId}/?${params.toString()}`;
}

export function getCategoryLabel(id: string): string {
  return categories.find((c) => c.id === id)?.label ?? id;
}

export const pricingPlans = [
  {
    name: "Gói Khởi Đầu",
    price: "4.900.000đ",
    period: "Trọn gói thiết lập",
    desc: "Phù hợp shop bán lẻ, quán cà phê, spa cần ra mắt nhanh.",
    highlight: false,
    features: [
      "Chọn 1 trong 19 mẫu giao diện chuẩn ngành",
      "Tuỳ biến logo, màu sắc, nội dung thương hiệu",
      "Hỗ trợ đăng ký & duyệt Mini App trên Zalo",
      "Tích hợp thông báo Zalo OA cơ bản",
      "Bảo hành kỹ thuật 3 tháng",
    ],
  },
  {
    name: "Gói Tiêu Chuẩn",
    price: "8.900.000đ",
    period: "Trọn gói + Backend",
    desc: "Dành cho doanh nghiệp cần quản lý đơn, lịch hẹn & dữ liệu riêng.",
    highlight: true,
    features: [
      "Mọi tính năng của Gói Khởi Đầu",
      "Backend riêng (NestJS + PostgreSQL) & trang quản trị",
      "Tích hợp lấy SĐT khách hàng & gửi tin ZNS",
      "Tích điểm thành viên, voucher khuyến mãi",
      "Bảo hành & hỗ trợ kỹ thuật 6 tháng",
    ],
  },
  {
    name: "Gói Doanh Nghiệp / KCN",
    price: "Liên hệ",
    period: "May đo theo yêu cầu",
    desc: "Phòng khám, công chứng, luật, nhà máy KCN cần quy trình riêng.",
    highlight: false,
    features: [
      "Thiết kế UI/UX & luồng nghiệp vụ riêng",
      "Kết nối ERP / HRM / máy chấm công / phần mềm có sẵn",
      "Phân quyền nhiều chi nhánh, phân xưởng",
      "Cam kết SLA vận hành 99.9% & hỗ trợ 24/7",
    ],
  },
];

export const faqs = [
  {
    q: "Thời gian triển khai một Zalo Mini App mất bao lâu?",
    a: "Với các mẫu có sẵn trên recloud.vn, thời gian hoàn thiện và gửi duyệt lên Zalo chỉ từ 5–14 ngày làm việc tuỳ mức độ tuỳ biến.",
  },
  {
    q: "Tôi có cần biết lập trình để quản lý nội dung không?",
    a: "Không cần. Đội ngũ kỹ thuật sẽ bàn giao trang quản trị trực quan để bạn tự cập nhật sản phẩm, dịch vụ, bảng giá, đơn hàng và lịch hẹn.",
  },
  {
    q: "Dữ liệu khách hàng và đơn hàng được lưu ở đâu?",
    a: "Dữ liệu được lưu trữ độc lập trên hệ thống PostgreSQL bảo mật theo từng doanh nghiệp, toàn quyền sở hữu và xuất báo cáo bất cứ lúc nào.",
  },
  {
    q: "Zalo có thu phí duy trì Mini App hàng tháng không?",
    a: "Zalo không thu phí mở Mini App. Bạn chỉ chi trả phí phát triển/vận hành máy chủ theo gói đã chọn và phí gửi tin ZNS (nếu có dùng).",
  },
];
