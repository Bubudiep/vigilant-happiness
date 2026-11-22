import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const templates = [
  { id: "thoi_trang_01", code: "T01", name: "Shop thời trang", brand: "LUMI Studio", description: "Cửa hàng thời trang: danh mục, chi tiết sản phẩm chọn màu/size, giỏ hàng, thành viên.", categories: ["fashion", "retail"], color: "#1f1f1f", features: ["Flash sale", "Chọn màu / size", "Giỏ hàng", "Thành viên"], featured: true },
  { id: "fnb_cafe_01", code: "T02", name: "Quán cà phê", brand: "Mộc Coffee", description: "Đặt đồ uống giao tận nơi hoặc lấy tại quán, tuỳ chọn size/đá/topping, tích tem thành viên.", categories: ["fnb"], color: "#6f4e37", features: ["Giao hàng / Lấy tại quán", "Tuỳ chọn món", "Tích tem"], featured: true },
  { id: "spa_01", code: "T03", name: "Spa / Salon", brand: "Lotus Spa & Beauty", description: "Đặt lịch chăm sóc da, massage, chọn kỹ thuật viên và khung giờ trống.", categories: ["spa"], color: "#be185d", features: ["Đặt lịch hẹn", "Chọn KTV", "Liệu trình"], featured: true },
  { id: "cat_toc_01", code: "T21", name: "Tiệm cắt tóc / Barber", brand: "Gentle Barber", description: "Bảng giá cắt – cạo – uốn – nhuộm, chọn thợ, đặt lịch theo giờ, lấy số xếp hàng & xem hàng chờ trực tiếp.", categories: ["spa"], color: "#1f2937", features: ["Đặt lịch chọn thợ", "Lấy số xếp hàng", "Kiểu tóc"], featured: true },
  { id: "nail_01", code: "T22", name: "Tiệm Nail", brand: "Mây Nail Studio", description: "Bảng giá sơn gel, vẽ, đắp móng; chọn mẫu & màu sơn, chọn thợ, đặt lịch theo giờ, tích điểm.", categories: ["spa"], color: "#db2777", features: ["Chọn mẫu & màu", "Đặt lịch chọn thợ", "Tích điểm"], featured: true },
  { id: "spa_02", code: "T23", name: "Spa dưỡng sinh & Liệu trình", brand: "An Nhiên Spa", description: "Massage, gội dưỡng sinh, chăm sóc da; bán gói liệu trình nhiều buổi, theo dõi buổi còn lại, đặt lịch chọn phòng.", categories: ["spa"], color: "#0f766e", features: ["Gói liệu trình", "Chọn phòng & KTV", "Ví trả trước"], featured: true },
  { id: "tiem_net_01", code: "T24", name: "Tiệm net / Cyber Game", brand: "Zone 9 Gaming", description: "Sơ đồ máy trống theo khu, đặt máy theo giờ, nạp ví giờ chơi, gọi đồ ăn uống tới máy, giải đấu.", categories: ["entertainment"], color: "#7c3aed", features: ["Sơ đồ máy", "Nạp giờ chơi", "Gọi đồ tới máy"], featured: true },
  { id: "fnb_nha_hang_01", code: "T04", name: "Nhà hàng", brand: "Bếp Quê Nhà", description: "Thực đơn món đặc sản, đặt bàn theo giờ & số lượng khách.", categories: ["fnb"], color: "#b45309", features: ["Thực đơn", "Đặt bàn", "Ưu đãi"] },
  { id: "sieu_thi_01", code: "T05", name: "Siêu thị mini", brand: "Xanh Mart", description: "Đi chợ online giao nhanh 2H, flash sale thực phẩm tươi sống.", categories: ["supermarket", "retail"], color: "#15803d", features: ["Giao nhanh 2H", "Flash sale", "Giỏ hàng"] },
  { id: "me_va_be_01", code: "T06", name: "Shop mẹ & bé", brand: "Bé Yêu Shop", description: "Gợi ý sữa, bỉm, đồ dùng theo độ tuổi của bé, cẩm nang nuôi con.", categories: ["mom_baby", "retail"], color: "#db2777", features: ["Hồ sơ bé", "Lọc độ tuổi", "Cẩm nang"] },
  { id: "phong_kham_01", code: "T07", name: "Phòng khám", brand: "An Khang Clinic", description: "Tìm bác sĩ theo chuyên khoa, đặt lịch khám nhanh không chờ đợi.", categories: ["health"], color: "#0284c7", features: ["Đặt lịch khám", "Chọn bác sĩ", "Hồ sơ"] },
  { id: "sieu_am_5d_01", code: "T16", name: "Phòng khám Siêu âm 5D", brand: "BabySee 5D Clinic", description: "Theo dõi tuần thai, lộ trình 8 mốc khám & xét nghiệm, lời nhắc hằng ngày, ảnh & video 5D.", categories: ["health", "mom_baby"], color: "#db2777", features: ["Theo dõi tuần thai", "8 mốc xét nghiệm", "Lời nhắc"], featured: true },
  { id: "cong_chung_01", code: "T17", name: "Văn phòng Công chứng", brand: "VPCC Tâm Đức", description: "Checklist giấy tờ, ước tính phí công chứng BĐS, đặt lịch ký tại văn phòng hoặc tận nơi.", categories: ["legal", "real_estate", "gov"], color: "#1e3a8a", features: ["Checklist giấy tờ", "Tính phí tự động", "Ký tận nơi"], featured: true },
  { id: "van_phong_luat_01", code: "T18", name: "Văn phòng Luật sư", brand: "Luật Minh Chính", description: "Đặt lịch tư vấn Luật sư qua Video/Zalo hoặc tại VP, theo dõi tiến độ hồ sơ vụ việc.", categories: ["legal"], color: "#1c1917", features: ["Đặt lịch Luật sư", "Soạn đơn từ", "Tiến độ hồ sơ"], featured: true },
  { id: "kcn_doanh_nghiep_01", code: "T19", name: "Doanh nghiệp & Nhà máy KCN", brand: "VinaTech Industrial", description: "Chấm công & bảng công, nộp ảnh giấy tờ HR, đơn từ & báo cáo 5S, hòm thư ẩn danh & hỏi đáp.", categories: ["enterprise"], color: "#0f766e", features: ["Check bảng công", "Nộp ảnh giấy tờ", "Đơn & Báo cáo", "Hòm thư"], featured: true },
  { id: "truong_hoc_01", code: "T08", name: "Trường học", brand: "THCS Ánh Sao", description: "Sổ liên lạc điện tử, thời khoá biểu, học phí và xin nghỉ phép.", categories: ["education"], color: "#4f46e5", features: ["Thời khoá biểu", "Học phí", "Xin nghỉ"] },
  { id: "khach_san_01", code: "T09", name: "Khách sạn / Resort", brand: "Sea Breeze Resort", description: "Đặt phòng nghỉ dưỡng, chọn ngày nhận/trả phòng và tiện ích.", categories: ["hotel"], color: "#0369a1", features: ["Tìm phòng", "Đặt phòng", "Tiện ích"] },
  { id: "bat_dong_san_01", code: "T10", name: "Bất động sản", brand: "An Cư Land", description: "Danh sách dự án, chi tiết căn hộ, đăng ký tham quan nhà mẫu.", categories: ["real_estate"], color: "#1e3a5f", features: ["Dự án hot", "Xem nhà mẫu", "Lưu dự án"] },
  { id: "co_quan_01", code: "T11", name: "UBND / Sở ban ngành", brand: "Cổng Dịch vụ công", description: "Tra cứu thủ tục hành chính, tin tức điều hành, phản ánh hiện trường.", categories: ["gov"], color: "#b91c1c", features: ["Thủ tục HC", "Phản ánh 24/7", "Tin tức"] },
  { id: "qua_tang_01", code: "T12", name: "Tiệm quà tặng", brand: "Hộp Quà Xinh", description: "Chọn quà theo dịp và người nhận, gói quà, viết thiệp.", categories: ["retail"], color: "#e11d48", features: ["Quà theo dịp", "Gói quà", "Viết thiệp"] },
  { id: "do_theu_01", code: "T13", name: "Order đồ thêu", brand: "Thêu Xinh Atelier", description: "Chọn phôi, nhập chữ, chọn màu chỉ, font – xem trước trực tiếp.", categories: ["retail", "fashion"], color: "#2a9d8f", features: ["Thêu theo yêu cầu", "Xem trước", "Tiến độ đơn"] },
  { id: "thue_trang_phuc_01", code: "T14", name: "Cho thuê trang phục", brand: "Xiêm Y Studio", description: "Áo dài, cổ phục, váy cưới – chọn size, ngày thuê, tính tiền cọc.", categories: ["fashion"], color: "#9a3412", features: ["Thuê theo ngày", "Tính cọc", "Lịch thuê"] },
  { id: "mixue_01", code: "T20", name: "Kem & Trà sữa", brand: "Mixue", description: "Mẫu đề xuất cho chuỗi kem & trà sữa: menu kem, trà sữa, trà chanh, tuỳ chọn size/đường/đá/topping, tích điểm.", categories: ["fnb"], color: "#e60012", features: ["Menu kem & trà", "Topping", "Tích điểm"], featured: true },
  { id: "bida_01", code: "T15", name: "Quán bida", brand: "Cơ Thủ Billiards", description: "Sơ đồ bàn trống thời gian thực, đặt bàn theo giờ, gọi đồ lên bàn.", categories: ["entertainment", "fnb"], color: "#0b6e4f", features: ["Sơ đồ bàn", "Đặt bàn", "Gọi đồ lên bàn"] },
];

async function main() {
  for (let i = 0; i < templates.length; i++) {
    const t = templates[i];
    await prisma.template.upsert({
      where: { id: t.id },
      update: { ...t, sortOrder: i + 1, status: "live" },
      create: { ...t, sortOrder: i + 1, status: "live" },
    });
  }
  console.log(`Seeded ${templates.length} templates.`);

  // Kênh public cho chính Mini App reMini: đăng nhập Zalo (grant zalo_mini_app) + refresh token.
  // Public client → không có secret (code Mini App chạy trên máy người dùng).
  await prisma.oAuthApplication.upsert({
    where: { clientId: "remini-zalo-miniapp" },
    update: { scopes: ["profile", "leads:write", "tickets:write"] },
    create: {
      name: "reMini – Zalo Mini App",
      channel: "zalo_mini_app",
      clientId: "remini-zalo-miniapp",
      clientType: "public",
      grantTypes: ["zalo_mini_app", "refresh_token"],
      scopes: ["profile", "leads:write", "tickets:write"],
      accessTokenTtl: 3600,
      refreshTokenTtl: 60 * 24 * 3600,
    },
  });
  console.log("Seeded OAuth client remini-zalo-miniapp.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
