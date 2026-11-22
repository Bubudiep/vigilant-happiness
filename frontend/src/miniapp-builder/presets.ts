import { BLOCKS, uid } from "./registry";
import { FREEPIK_STOCK } from "./stock-images";
import type { Block, BlockItem, BlockProps, BlockType, BuilderPage, BuilderSchema, BuilderTheme } from "./types";

const block = (type: BlockType, overrides: BlockProps = {}, name?: string): Block => ({
  id: uid(type.slice(0, 3)),
  type,
  name,
  props: { ...BLOCKS[type].defaults(), ...overrides },
});

const items = (list: Array<Omit<BlockItem, "id">>, prefix = "i"): BlockItem[] =>
  list.map((x) => ({ ...x, id: uid(prefix) }));

const page = (name: string, route: string, icon: string, blocks: Block[], inTabbar = true): BuilderPage => ({
  id: uid("pg"),
  name,
  route,
  icon,
  inTabbar,
  blocks,
});

export type PresetCategory =
  | "Bán lẻ & Thời trang"
  | "F&B & Nhà hàng"
  | "Y tế & Làm đẹp"
  | "Dịch vụ & Du lịch"
  | "Pháp lý & Giáo dục"
  | "Doanh nghiệp & KCN";

export interface PresetMeta {
  id: string;
  code: string;
  name: string;
  category: PresetCategory;
  industry: string;
  description: string;
  theme: BuilderTheme;
  build: (brand: string) => BuilderPage[];
}

const accountPage = (brand: string, extra: Block[] = []) =>
  page("Tài khoản", "/account", "user", [
    block("profile", { title: "Nguyễn Minh Anh", subtitle: `Thành viên ${brand}` }),
    block("memberCard", { variant: "minimal" }),
    ...extra,
    block("menuList"),
  ]);

export const PRESET_CATEGORIES: PresetCategory[] = [
  "Bán lẻ & Thời trang",
  "F&B & Nhà hàng",
  "Y tế & Làm đẹp",
  "Dịch vụ & Du lịch",
  "Pháp lý & Giáo dục",
  "Doanh nghiệp & KCN",
];

const retailItems = () =>
  items([
    { label: "Áo sơ mi Linen cổ tàu", sub: "Chất vải thoáng mát · 3 màu", price: 389000, oldPrice: 490000, badge: "BEST", image: FREEPIK_STOCK.retail.products[0] },
    { label: "Đầm midi dáng suông thanh lịch", sub: "Thiết kế độc quyền mùa hè", price: 649000, oldPrice: 790000, badge: "-18%", image: FREEPIK_STOCK.retail.products[1] },
    { label: "Blazer tối giản form Hàn", sub: "Vải tuyết mưa cao cấp", price: 890000, oldPrice: 1090000, badge: "NEW", image: FREEPIK_STOCK.retail.products[2] },
    { label: "Set dạo phố Linen phối quần ống rộng", sub: "Tôn dáng · Dễ phối đồ", price: 750000, oldPrice: 920000, image: FREEPIK_STOCK.retail.products[3] },
    { label: "Túi xách da mềm tối giản", sub: "Phụ kiện công sở · Kèm dây đeo", price: 540000, oldPrice: 680000, badge: "HOT", image: FREEPIK_STOCK.retail.products[4] },
    { label: "Áo khoác cardigan len mỏng", sub: "Phù hợp đi làm & dạo phố", price: 420000, oldPrice: 520000, image: FREEPIK_STOCK.retail.products[5] },
  ]);

const fnbItems = () =>
  items([
    { label: "Cold Brew Cam Sả", sub: "Ủ lạnh 18 giờ · Thơm thanh mát", price: 55000, oldPrice: 65000, badge: "BEST", image: FREEPIK_STOCK.fnb.products[0] },
    { label: "Espresso Rang Xay Nguyên Chất", sub: "100% Arabica Cầu Đất", price: 42000, image: FREEPIK_STOCK.fnb.products[1] },
    { label: "Croissant Bơ Pháp Nướng Giòn", sub: "Bánh mới ra lò mỗi sáng", price: 45000, badge: "NEW", image: FREEPIK_STOCK.fnb.products[2] },
    { label: "Cà Phê Sữa Đá Sài Gòn", sub: "Đậm vị · Sữa đặc béo thơm", price: 39000, image: FREEPIK_STOCK.fnb.products[3] },
    { label: "Matcha Latte Uji Nhật Bản", sub: "Trà xanh thượng hạng & sữa tươi", price: 59000, oldPrice: 69000, badge: "HOT", image: FREEPIK_STOCK.fnb.products[4] },
    { label: "Bánh Tiramisu Cà Phê Ý", sub: "Kem Mascarpone béo mịn", price: 65000, image: FREEPIK_STOCK.fnb.products[5] },
  ]);

const restaurantItems = () =>
  items([
    { label: "Bò Bít Tết Sốt Tiêu Đen", sub: "Thăn ngoại bò Mỹ nướng vừa · Khoai nghiền", price: 345000, oldPrice: 395000, badge: "BEST", image: FREEPIK_STOCK.restaurant.products[0] },
    { label: "Set Sashimi Hải Sản Cao Cấp", sub: "Cá hồi, cá ngừ, sò điệp tươi sống", price: 490000, oldPrice: 560000, badge: "CHEF", image: FREEPIK_STOCK.restaurant.products[1] },
    { label: "Set Lẩu Thái Hải Sản 4 Người", sub: "Tôm sú, mực, ba chỉ bò & rau nấm", price: 590000, oldPrice: 690000, badge: "-15%", image: FREEPIK_STOCK.restaurant.products[2] },
    { label: "Cá Hồi Áp Chảo Sốt Chanh Dây", sub: "Kèm măng tây nướng & salad", price: 285000, image: FREEPIK_STOCK.restaurant.products[3] },
    { label: "Sườn Nướng Tảng BBQ Mật Ong", sub: "Nướng chậm 6 giờ mềm tan", price: 420000, oldPrice: 480000, badge: "HOT", image: FREEPIK_STOCK.restaurant.products[4] },
    { label: "Combo Tiệc Gia Đình 6 Món", sub: "Phục vụ 4–6 khách · Tặng tráng miệng", price: 1190000, oldPrice: 1450000, badge: "COMBO", image: FREEPIK_STOCK.restaurant.products[5] },
  ]);

const spaItems = () =>
  items([
    { label: "Chăm sóc da chuyên sâu 60p", sub: "Cấp ẩm + đắp mặt nạ sinh học", price: 450000, oldPrice: 600000, badge: "BEST", image: FREEPIK_STOCK.spa.products[0] },
    { label: "Massage mặt thư giãn nâng cơ", sub: "Tinh dầu thiên nhiên cao cấp", price: 380000, oldPrice: 480000, image: FREEPIK_STOCK.spa.products[1] },
    { label: "Làm sạch sâu & thải độc da", sub: "Công nghệ Hydra-Clean chuẩn y khoa", price: 520000, oldPrice: 650000, badge: "HOT", image: FREEPIK_STOCK.spa.products[2] },
    { label: "Soi da & Tư vấn phác đồ 1:1", sub: "Bác sĩ da liễu trực tiếp thăm khám", price: 290000, badge: "NEW", image: FREEPIK_STOCK.spa.products[3] },
    { label: "Massage body đá nóng 90p", sub: "Xông hơi thảo dược & ấn huyệt cổ vai gáy", price: 590000, oldPrice: 750000, badge: "-21%", image: FREEPIK_STOCK.spa.products[4] },
    { label: "Trẻ hoá & Căng bóng Collagen", sub: "Phục hồi da tức thì không xâm lấn", price: 890000, oldPrice: 1200000, image: FREEPIK_STOCK.spa.products[5] },
  ]);

const clinicItems = () =>
  items([
    { label: "Siêu âm 5D hình thái thai nhi", sub: "Bác sĩ CKII thực hiện · Tặng video Full HD", price: 450000, oldPrice: 550000, badge: "5D HD", image: FREEPIK_STOCK.clinic.products[0] },
    { label: "Khám tổng quát & Xét nghiệm máu", sub: "24 chỉ số sinh hoá · Trả kết quả qua Zalo", price: 890000, oldPrice: 1100000, badge: "BEST", image: FREEPIK_STOCK.clinic.products[1] },
    { label: "Xét nghiệm sàng lọc NIPT cơ bản", sub: "An toàn không xâm lấn · Trả kết quả 5 ngày", price: 2800000, oldPrice: 3200000, badge: "-12%", image: FREEPIK_STOCK.clinic.products[2] },
    { label: "Khám Nha khoa & Cạo vôi răng", sub: "Công nghệ sóng siêu âm không ê buốt", price: 350000, image: FREEPIK_STOCK.clinic.products[3] },
    { label: "Khám Nhi khoa & Tư vấn dinh dưỡng", sub: "Theo dõi biểu đồ tăng trưởng cho bé", price: 250000, badge: "HOT", image: FREEPIK_STOCK.clinic.products[4] },
    { label: "Gói Khám Sức Khoẻ Gia Đình", sub: "Dành cho 2 người lớn · Ưu tiên không chờ", price: 1650000, oldPrice: 2100000, badge: "COMBO", image: FREEPIK_STOCK.clinic.products[5] },
  ]);

const supermarketItems = () =>
  items([
    { label: "Combo Rau Củ Hữu Cơ Đà Lạt 3kg", sub: "Thu hoạch sáng sớm · Chuẩn VietGAP", price: 119000, oldPrice: 149000, badge: "FRESH", image: FREEPIK_STOCK.supermarket.products[0] },
    { label: "Giỏ Trái Cây Nhập Khẩu Tươi Ngon", sub: "Táo Envy, nho không hạt, cam Úc", price: 289000, oldPrice: 340000, badge: "-15%", image: FREEPIK_STOCK.supermarket.products[1] },
    { label: "Thịt Ba Chỉ Bò Mỹ Cắt Lát 500g", sub: "Đóng khay hút chân không chuẩn mát", price: 145000, oldPrice: 175000, badge: "HOT", image: FREEPIK_STOCK.supermarket.products[2] },
    { label: "Trứng Gà Ta Thả Vườn (Vỉ 10 Quả)", sub: "Lòng đỏ đậm · Giao lạnh an toàn", price: 42000, image: FREEPIK_STOCK.supermarket.products[3] },
    { label: "Sữa Tươi Thanh Trùng Organic 1L", sub: "Không đường · Nguyên chất 100%", price: 54000, oldPrice: 62000, badge: "BEST", image: FREEPIK_STOCK.supermarket.products[4] },
    { label: "Gạo ST25 Đặc Sản Sóc Trăng 5kg", sub: "Hạt dài thơm dẻo · Bao chuẩn chính hãng", price: 185000, oldPrice: 210000, image: FREEPIK_STOCK.supermarket.products[5] },
  ]);

const mombabyItems = () =>
  items([
    { label: "Sữa Công Thức Cao Cấp Số 1 (800g)", sub: "Bổ sung DHA & HMO tăng đề kháng", price: 585000, oldPrice: 650000, badge: "BEST", image: FREEPIK_STOCK.mombaby.products[0] },
    { label: "Tã Quần Siêu Thấm Nhật Bản (Size M)", sub: "Bịch đại 64 miếng · Mềm mại chống hăm", price: 325000, oldPrice: 380000, badge: "-14%", image: FREEPIK_STOCK.mombaby.products[1] },
    { label: "Set Quần Áo Sơ Sinh Cotton Organic", sub: "Combo 5 bộ thoáng khí an toàn cho da bé", price: 299000, oldPrice: 360000, badge: "NEW", image: FREEPIK_STOCK.mombaby.products[2] },
    { label: "Bình Sữa PPSU Chống Sặc 240ml", sub: "Núm ti silicon siêu mềm chuẩn y tế", price: 265000, image: FREEPIK_STOCK.mombaby.products[3] },
    { label: "Bộ Đồ Chơi Gỗ Phát Triển Tư Duy", sub: "Sơn an toàn · Phù hợp bé từ 1–3 tuổi", price: 219000, oldPrice: 279000, badge: "HOT", image: FREEPIK_STOCK.mombaby.products[4] },
    { label: "Combo Đi Sinh Trọn Gói 20 Món", sub: "Đầy đủ đồ cho mẹ & bé · Tặng giỏ xách", price: 1290000, oldPrice: 1650000, badge: "COMBO", image: FREEPIK_STOCK.mombaby.products[5] },
  ]);

const giftItems = () =>
  items([
    { label: "Hộp Quà Sinh Nhật Thêu Tên Riêng", sub: "Khăn lụa + nến thơm + thiệp viết tay", price: 490000, oldPrice: 590000, badge: "BEST", image: FREEPIK_STOCK.gift.products[0] },
    { label: "Bó Hoa Hồng Kem Kèm Hộp Quà", sub: "Hoa tươi nhập khẩu · Giao nhanh 2H", price: 650000, oldPrice: 750000, badge: "HOT", image: FREEPIK_STOCK.gift.products[1] },
    { label: "Set Quà Tặng Doanh Nghiệp VIP", sub: "Sổ da + bút ký khắc laser + bình giữ nhiệt", price: 790000, oldPrice: 950000, badge: "B2B", image: FREEPIK_STOCK.gift.products[2] },
    { label: "Hộp Chocolate Thủ Công & Trà Hoa", sub: "16 viên truffle Bỉ + trà hoa hồng", price: 420000, badge: "NEW", image: FREEPIK_STOCK.gift.products[3] },
    { label: "Túi Tote Vải Canvas Thêu Tay", sub: "Tuỳ chọn tên & biểu tượng theo yêu cầu", price: 245000, oldPrice: 295000, image: FREEPIK_STOCK.gift.products[4] },
    { label: "Giỏ Quà Rượu Vang & Hạt Dinh Dưỡng", sub: "Hộp gỗ sang trọng · Tặng túi giấy cao cấp", price: 1350000, oldPrice: 1590000, badge: "LUXURY", image: FREEPIK_STOCK.gift.products[5] },
  ]);

const hotelItems = () =>
  items([
    { label: "Deluxe Ocean View", sub: "38m² · 1 giường King · Ban công biển", price: 1650000, oldPrice: 2100000, badge: "BEST", image: FREEPIK_STOCK.hotel.products[0] },
    { label: "Premier Garden Suite", sub: "48m² · Bồn tắm đá · View vườn nhiệt đới", price: 2250000, oldPrice: 2700000, badge: "-17%", image: FREEPIK_STOCK.hotel.products[1] },
    { label: "Family Suite 2 Phòng Ngủ", sub: "68m² · Phù hợp gia đình 4 người · Buffet sáng", price: 2890000, oldPrice: 3400000, badge: "FAMILY", image: FREEPIK_STOCK.hotel.products[2] },
    { label: "Private Pool Villa", sub: "120m² · Hồ bơi riêng · Quản gia 24/7", price: 5400000, oldPrice: 6500000, badge: "VIP", image: FREEPIK_STOCK.hotel.products[3] },
    { label: "Combo Nghỉ Dưỡng 2N1Đ + Spa", sub: "Phòng Deluxe + Massage 60p cho 2 khách", price: 2190000, oldPrice: 2850000, badge: "COMBO", image: FREEPIK_STOCK.hotel.products[4] },
    { label: "Gói Honeymoon Lãng Mạn", sub: "Trang trí phòng hoa tươi + Bữa tối bên biển", price: 3290000, oldPrice: 3900000, badge: "NEW", image: FREEPIK_STOCK.hotel.products[5] },
  ]);

const realestateItems = () =>
  items([
    { label: "The Vista Riverside · Căn 2PN", sub: "72m² · Sổ hồng lâu dài · View sông trực diện", price: 3450000000, badge: "HOT", image: FREEPIK_STOCK.realestate.products[0] },
    { label: "Skyline Residence · Căn 3PN Góc", sub: "105m² · Full nội thất cao cấp · 2 ban công", price: 5200000000, badge: "VIP", image: FREEPIK_STOCK.realestate.products[1] },
    { label: "Biệt Thự Vườn Ven Hồ", sub: "220m² · 3 tầng · Sân vườn & hồ bơi riêng", price: 14800000000, badge: "LUXURY", image: FREEPIK_STOCK.realestate.products[2] },
    { label: "Shophouse Đại Lộ Trung Tâm", sub: "110m² · 4 tầng · Tiềm năng kinh doanh cao", price: 8900000000, badge: "NEW", image: FREEPIK_STOCK.realestate.products[3] },
    { label: "Căn Hộ Studio Cho Thuê Dòng Tiền", sub: "38m² · Cam kết lợi nhuận 8%/năm", price: 1850000000, badge: "BEST", image: FREEPIK_STOCK.realestate.products[4] },
    { label: "Penthouse Duplex Tầng Thượng", sub: "185m² · Thang máy riêng · Tầm nhìn 360°", price: 12500000000, image: FREEPIK_STOCK.realestate.products[5] },
  ]);

const legalItems = () =>
  items([
    { label: "Công chứng Hợp đồng Mua bán BĐS", sub: "Kiểm tra pháp lý trước · Hỗ trợ ký tận nơi", price: 1500000, badge: "NHANH", image: FREEPIK_STOCK.legal.products[0] },
    { label: "Thành lập Doanh nghiệp Trọn gói", sub: "Giấy phép ĐKKD + Con dấu + Chữ ký số", price: 2900000, oldPrice: 3500000, badge: "BEST", image: FREEPIK_STOCK.legal.products[1] },
    { label: "Tư vấn & Soạn thảo Hợp đồng 1:1", sub: "Luật sư chuyên ngành thương mại rà soát", price: 1200000, image: FREEPIK_STOCK.legal.products[2] },
    { label: "Công chứng Uỷ quyền & Di chúc", sub: "Bảo mật tuyệt đối · Đặt lịch không chờ", price: 650000, badge: "HOT", image: FREEPIK_STOCK.legal.products[3] },
  ]);

const educationItems = () =>
  items([
    { label: "Tiếng Anh Giao Tiếp & IELTS 6.5+", sub: "Lớp nhỏ 10 học viên · Cam kết đầu ra", price: 4800000, oldPrice: 5600000, badge: "BEST", image: FREEPIK_STOCK.education.products[0] },
    { label: "Lập trình Robotics & STEM Thiếu nhi", sub: "Thực hành dự án mỗi buổi · Từ 7–14 tuổi", price: 3200000, oldPrice: 3800000, badge: "HOT", image: FREEPIK_STOCK.education.products[1] },
    { label: "Khoá Học Kỹ Năng Thuyết Trình", sub: "Rèn luyện tự tin trước đám đông trong 8 tuần", price: 2450000, badge: "NEW", image: FREEPIK_STOCK.education.products[2] },
    { label: "Toán Tư Duy Singapore Online 1:1", sub: "Lộ trình cá nhân hoá · Báo cáo phụ huynh", price: 2900000, oldPrice: 3400000, image: FREEPIK_STOCK.education.products[3] },
    { label: "Luyện Thi Đại Học Chuyên Sâu", sub: "Đội ngũ giáo viên chuyên · Thi thử hàng tuần", price: 3900000, badge: "-15%", image: FREEPIK_STOCK.education.products[4] },
    { label: "Trại Hè Tiếng Anh Quốc Tế 2 Tuần", sub: "Hoạt động ngoại khoá + 100% giáo viên bản ngữ", price: 6500000, oldPrice: 7500000, badge: "SUMMER", image: FREEPIK_STOCK.education.products[5] },
  ]);

const billiardsItems = () =>
  items([
    { label: "Combo 2 Giờ Bàn Pool + 2 Nước", sub: "Bàn chuẩn thi đấu Aplus · Bi Aramith", price: 159000, oldPrice: 199000, badge: "HOT", image: FREEPIK_STOCK.billiards.products[0] },
    { label: "Thuê Bàn Carom 3 Băng VIP (1 Giờ)", sub: "Phòng lạnh riêng · Cơ carbon cao cấp", price: 110000, badge: "VIP", image: FREEPIK_STOCK.billiards.products[1] },
    { label: "Combo Nhóm 4 Người (3 Giờ + Snack)", sub: "Tặng 4 nước tự chọn + khoai tây lắc", price: 349000, oldPrice: 430000, badge: "-19%", image: FREEPIK_STOCK.billiards.products[2] },
    { label: "Vé Tham Gia Giải Đấu Tuần", sub: "Bốc thăm chia bảng · Cơ hội nhận cúp & thưởng", price: 200000, badge: "EVENT", image: FREEPIK_STOCK.billiards.products[3] },
    { label: "Trà Đào Cam Sả & Cà Phê Phục Vụ Tại Bàn", sub: "Gọi trực tiếp qua Mini App không cần rời bàn", price: 45000, image: FREEPIK_STOCK.fnb.products[0] },
    { label: "Đĩa Khô Gà & Xúc Xích Nướng Nóng", sub: "Phục vụ nhanh trong 8 phút", price: 79000, image: FREEPIK_STOCK.fnb.products[2] },
  ]);

export const PRESETS: PresetMeta[] = [
  {
    id: "retail",
    code: "T01",
    name: "Shop Thời trang",
    category: "Bán lẻ & Thời trang",
    industry: "Thời trang · Bán lẻ",
    description: "Banner editorial, Flash Sale, lưới sản phẩm, voucher, thẻ thành viên",
    theme: { primary: "#111827", accent: "#f59e0b", bg: "#f6f5f2", radius: 16, font: "Inter", tabbarStyle: "classic" },
    build: (brand) => [
      page("Trang chủ", "/", "home", [
        block("header", { title: brand, subtitle: "Thời trang thiết kế · Giao nhanh nội thành", verified: true, variant: "pastel" }),
        block("search"),
        block("banner"),
        block("categories"),
        block("flashSale", { source: "manual", limit: 6, items: retailItems() }),
        block("productGrid", { title: "Bán chạy nhất", source: "manual", limit: 6, items: retailItems() }),
      ]),
      page("Danh mục", "/category", "grid", [
        block("search", { placeholder: "Tìm áo, đầm, phụ kiện..." }),
        block("categories", { title: "" }),
        block("productGrid", { title: "Tất cả sản phẩm", source: "manual", limit: 6, showViewAll: false, items: retailItems() }),
      ]),
      page("Ưu đãi", "/deals", "gift", [
        block("notice", { title: "Nhập mã WELCOME50K giảm 50K cho đơn từ 299K" }),
        block("voucherList"),
        block("flashSale", { title: "Deal sốc hôm nay", source: "manual", limit: 6, items: retailItems() }),
      ]),
      accountPage(brand, [block("policyList", { title: "Chính sách mua hàng" })]),
    ],
  },
  {
    id: "fnb",
    code: "T02",
    name: "Quán Cà phê",
    category: "F&B & Nhà hàng",
    industry: "Cà phê · Trà sữa",
    description: "Đặt món giao hàng hoặc mang đi, thẻ tích tem đổi ly miễn phí",
    theme: { primary: "#7c4a2d", accent: "#f59e0b", bg: "#fbf7f2", radius: 20, font: "Be Vietnam Pro", tabbarStyle: "floating", appBarStyle: "transparent" },
    build: (brand) => [
      page("Trang chủ", "/", "home", [
        block("header", { title: brand, subtitle: "Cà phê rang xay · Đặt giao tận nơi", verified: true, variant: "pastel" }),
        block("memberCard", { title: "Thẻ tích tem", subtitle: "6/10 tem · Còn 4 tem nhận ly miễn phí", variant: "stamp", ctaLabel: "Quét mã" }),
        block("quickActions", {
          items: items([
            { label: "Giao hàng", icon: "truck", color: "#f97316" },
            { label: "Mang đi", icon: "coffee", color: "#7c4a2d" },
            { label: "Đặt bàn", icon: "calendar", color: "#0ea5e9" },
            { label: "Ưu đãi", icon: "gift", color: "#e11d48" },
          ]),
        }),
        block("banner", {
          items: items([
            { label: "Signature Cold Brew", sub: "Mua 1 tặng 1 từ 14h – 17h", badge: "HAPPY HOUR", image: FREEPIK_STOCK.fnb.banner1, color: "#7c4a2d", colorTo: "#d97706" },
            { label: "Bánh mới mỗi sáng", sub: "Croissant bơ Pháp nướng tại quán", badge: "NEW", image: FREEPIK_STOCK.fnb.banner2, color: "#be123c", colorTo: "#f59e0b" },
          ]),
        }),
        block("productGrid", {
          title: "Món được yêu thích",
          variant: "minimal",
          source: "manual",
          limit: 6,
          items: fnbItems(),
        }),
      ]),
      page("Thực đơn", "/menu", "food", [
        block("categories", {
          title: "",
          items: items([{ label: "Cà phê" }, { label: "Trà trái cây" }, { label: "Matcha" }, { label: "Bánh ngọt" }]),
        }),
        block("productList", { title: "Thực đơn hôm nay", source: "manual", limit: 6, showViewAll: false, ctaLabel: "Thêm", items: fnbItems() }),
      ]),
      page("Đơn hàng", "/orders", "receipt", [
        block("notice", { title: "Đơn hàng của bạn sẽ được chuẩn bị trong 10 phút" }),
        block("voucherList", { title: "Voucher của bạn" }),
      ]),
      accountPage(brand),
    ],
  },
  {
    id: "restaurant",
    code: "T04",
    name: "Nhà hàng Ẩm thực",
    category: "F&B & Nhà hàng",
    industry: "Nhà hàng · Đặt bàn",
    description: "Thực đơn món đặc sản, đặt bàn theo khung giờ và combo gia đình",
    theme: { primary: "#b45309", accent: "#dc2626", bg: "#fffaf5", radius: 18, font: "Be Vietnam Pro", tabbarStyle: "classic" },
    build: (brand) => [
      page("Trang chủ", "/", "home", [
        block("header", { title: brand, subtitle: "Ẩm thực tinh hoa · Đặt bàn không chờ đợi", verified: true, variant: "solid" }),
        block("banner", {
          items: items([
            { label: "Combo Tiệc Gia Đình", sub: "Ưu đãi 20% khi đặt bàn trước qua Zalo", badge: "-20%", image: FREEPIK_STOCK.restaurant.banner1, color: "#b45309", colorTo: "#dc2626" },
            { label: "Món Mới Mùa Lễ Hội", sub: "Tặng tráng miệng cho nhóm từ 4 khách", badge: "SPECIAL", image: FREEPIK_STOCK.restaurant.banner2, color: "#9a3412", colorTo: "#f59e0b" },
          ]),
        }),
        block("booking", { title: "Đặt bàn nhanh", subtitle: "Chọn giờ đến để nhà hàng giữ chỗ đẹp", ctaLabel: "Giữ bàn ngay" }),
        block("productList", {
          title: "Món đặc sản nổi bật",
          ctaLabel: "Chọn món",
          source: "manual",
          limit: 6,
          items: restaurantItems(),
        }),
      ]),
      page("Thực đơn", "/menu", "food", [
        block("categories", { title: "", items: items([{ label: "Khai vị" }, { label: "Món chính" }, { label: "Lẩu & Nướng" }, { label: "Combo tiệc" }]) }),
        block("productGrid", { title: "Toàn bộ thực đơn", source: "manual", limit: 6, showViewAll: false, items: restaurantItems() }),
      ]),
      page("Đặt bàn", "/booking", "calendar", [block("booking", { title: "Đặt bàn trước" }), block("contact")]),
      accountPage(brand),
    ],
  },
  {
    id: "spa",
    code: "T03",
    name: "Spa & Thẩm mỹ",
    category: "Y tế & Làm đẹp",
    industry: "Spa · Salon · Beauty",
    description: "Đặt lịch theo khung giờ, gói liệu trình, cẩm nang làm đẹp & thẻ VIP",
    theme: { primary: "#be185d", accent: "#f9a8d4", bg: "#fdf4f8", radius: 22, font: "Be Vietnam Pro", tabbarStyle: "minimal", appBarStyle: "transparent" },
    build: (brand) => [
      page("Trang chủ", "/", "home", [
        block("header", { title: brand, subtitle: "Spa & Chăm sóc sắc đẹp chuẩn y khoa", verified: true, variant: "solid" }),
        block("banner", {
          variant: "split",
          items: items([
            { label: "Liệu trình chăm sóc da", sub: "Giảm 40% cho khách hàng mới", badge: "-40%", image: FREEPIK_STOCK.spa.banner1, color: "#be185d", colorTo: "#f472b6" },
            { label: "Massage đá nóng", sub: "Tặng kèm xông hơi thảo dược", badge: "HOT", image: FREEPIK_STOCK.spa.banner2, color: "#7e22ce", colorTo: "#ec4899" },
          ]),
        }),
        block("booking"),
        block("productList", {
          title: "Gói dịch vụ nổi bật",
          ctaLabel: "Đặt",
          source: "manual",
          limit: 6,
          items: spaItems(),
        }),
        block("news", {
          title: "Cẩm nang làm đẹp",
          items: items([
            { label: "5 bước phục hồi da sau nắng chuẩn y khoa", sub: "Chuyên gia da liễu · 2 giờ trước", image: FREEPIK_STOCK.spa.news1, color: "#be185d" },
            { label: "Bí quyết giữ ẩm da suốt mùa hanh khô", sub: "Hôm qua", image: FREEPIK_STOCK.spa.news2, color: "#ec4899" },
          ]),
        }),
      ]),
      page("Đặt lịch", "/booking", "calendar", [
        block("booking", { title: "Chọn khung giờ", subtitle: "Kỹ thuật viên sẽ xác nhận trong 5 phút" }),
        block("form", { title: "Thông tin đặt lịch", ctaLabel: "Xác nhận đặt lịch" }),
      ]),
      page("Liên hệ", "/contact", "map", [block("contact"), block("policyList", { title: "Chính sách dịch vụ" })]),
      accountPage(brand),
    ],
  },
  {
    id: "clinic",
    code: "T16",
    name: "Phòng khám & Siêu âm 5D",
    category: "Y tế & Làm đẹp",
    industry: "Phòng khám · Sản khoa 5D",
    description: "Đặt lịch bác sĩ, 8 mốc khám thai, theo dõi hồ sơ & trả ảnh 5D",
    theme: { primary: "#0284c7", accent: "#db2777", bg: "#f0f9ff", radius: 18, font: "Inter", tabbarStyle: "classic" },
    build: (brand) => [
      page("Trang chủ", "/", "home", [
        block("header", { title: brand, subtitle: "Phòng khám chuyên khoa · Đặt lịch không chờ", verified: true, variant: "solid" }),
        block("notice", { title: "Nhắc lịch: Khám định kỳ & Siêu âm 5D nhận video Full HD qua Zalo" }),
        block("quickActions", {
          items: items([
            { label: "Đặt khám", icon: "calendar", color: "#0284c7" },
            { label: "Bác sĩ", icon: "doctor", color: "#0ea5e9" },
            { label: "Mốc thai kỳ", icon: "heart", color: "#db2777" },
            { label: "Kết quả", icon: "file", color: "#10b981" },
          ]),
        }),
        block("banner", {
          items: items([
            { label: "Gói Siêu âm 5D Sắc Nét", sub: "Tặng bộ ảnh in màu + video lưu kỷ niệm", badge: "5D HD", image: FREEPIK_STOCK.clinic.banner1, color: "#0284c7", colorTo: "#db2777" },
            { label: "Khám Tổng Quát Gia Đình", sub: "Đặt lịch trước giảm 15% phí xét nghiệm", badge: "-15%", image: FREEPIK_STOCK.clinic.banner2, color: "#0369a1", colorTo: "#0ea5e9" },
          ]),
        }),
        block("booking", { title: "Đặt lịch khám nhanh", subtitle: "Chọn khung giờ ưu tiên lấy số trước", ctaLabel: "Lấy số khám" }),
        block("productList", {
          title: "Gói khám & Xét nghiệm nổi bật",
          ctaLabel: "Đặt lịch",
          source: "manual",
          limit: 6,
          items: clinicItems(),
        }),
      ]),
      page("Dịch vụ", "/services", "doctor", [
        block("productGrid", {
          title: "Tất cả gói khám chuyên khoa",
          source: "manual",
          limit: 6,
          showViewAll: false,
          items: clinicItems(),
        }),
      ]),
      page("Liên hệ", "/contact", "map", [block("contact")]),
      accountPage(brand),
    ],
  },
  {
    id: "supermarket",
    code: "T05",
    name: "Siêu thị Mini 2H",
    category: "Bán lẻ & Thời trang",
    industry: "Siêu thị · Thực phẩm sạch",
    description: "Đi chợ online giao nhanh 2H, Flash Sale hàng ngày & voucher freeship",
    theme: { primary: "#15803d", accent: "#f59e0b", bg: "#f4fbf6", radius: 14, font: "Inter", tabbarStyle: "indicator" },
    build: (brand) => [
      page("Trang chủ", "/", "home", [
        block("header", { title: brand, subtitle: "Thực phẩm tươi sống · Giao nhanh 2 giờ", verified: true, variant: "solid" }),
        block("search", { placeholder: "Tìm rau củ, thịt cá, sữa, gia vị..." }),
        block("banner", {
          items: items([
            { label: "Rau Củ Hữu Cơ Tươi Mỗi Sáng", sub: "Freeship 2H cho đơn từ 199K", badge: "ORGANIC", image: FREEPIK_STOCK.supermarket.banner1, color: "#15803d", colorTo: "#22c55e" },
            { label: "Trái Cây Nhập Khẩu Giảm 25%", sub: "Cam kết tươi mới · Đổi trả trong ngày", badge: "-25%", image: FREEPIK_STOCK.supermarket.banner2, color: "#047857", colorTo: "#f59e0b" },
          ]),
        }),
        block("quickActions", {
          items: items([
            { label: "Rau củ", icon: "sparkles", color: "#16a34a" },
            { label: "Thịt cá", icon: "food", color: "#dc2626" },
            { label: "Giao 2H", icon: "truck", color: "#0284c7" },
            { label: "Flash Sale", icon: "flame", color: "#f97316" },
          ]),
        }),
        block("flashSale", { title: "Giờ Vàng Đi Chợ", source: "manual", limit: 6, items: supermarketItems() }),
        block("voucherList", { title: "Mã Freeship hôm nay" }),
        block("productGrid", { title: "Hàng tươi mới mỗi sáng", columns: 2, source: "manual", limit: 6, items: supermarketItems() }),
      ]),
      page("Danh mục", "/category", "grid", [
        block("categories", { title: "", items: items([{ label: "Tươi sống" }, { label: "Trái cây" }, { label: "Sữa & Bé" }, { label: "Đồ khô" }, { label: "Gia dụng" }]) }),
        block("productGrid", { title: "Sản phẩm bán chạy", source: "manual", limit: 6, showViewAll: false, items: supermarketItems() }),
      ]),
      page("Ưu đãi", "/deals", "ticket", [block("voucherList"), block("flashSale", { source: "manual", limit: 6, items: supermarketItems() })]),
      accountPage(brand),
    ],
  },
  {
    id: "mombaby",
    code: "T06",
    name: "Shop Mẹ & Bé",
    category: "Bán lẻ & Thời trang",
    industry: "Mẹ & Bé · Sữa bỉm",
    description: "Gợi ý sữa bỉm theo độ tuổi của bé, tích điểm đổi quà, cẩm nang nuôi con",
    theme: { primary: "#db2777", accent: "#f472b6", bg: "#fff5f9", radius: 20, font: "Be Vietnam Pro", tabbarStyle: "floating" },
    build: (brand) => [
      page("Trang chủ", "/", "home", [
        block("header", { title: brand, subtitle: "Chính hãng 100% · Đồng hành cùng mẹ & bé", verified: true, variant: "pastel" }),
        block("search", { placeholder: "Tìm sữa công thức, tã bỉm, đồ sơ sinh..." }),
        block("banner", {
          items: items([
            { label: "Mua 2 Bỉm Tặng Đồ Chơi", sub: "Freeship tận nhà trong 2H cho mẹ bỉm", badge: "MẸ & BÉ", image: FREEPIK_STOCK.mombaby.banner1, color: "#db2777", colorTo: "#f472b6" },
            { label: "Combo Đi Sinh Trọn Gói", sub: "Tiết kiệm 25% · Tặng giỏ đồ sơ sinh", badge: "-25%", image: FREEPIK_STOCK.mombaby.banner2, color: "#9333ea", colorTo: "#ec4899" },
          ]),
        }),
        block("categories", { title: "Chọn theo độ tuổi", items: items([{ label: "0–6 tháng" }, { label: "6–12 tháng" }, { label: "1–3 tuổi" }, { label: "Mẹ bầu" }]) }),
        block("productGrid", { title: "Sữa & Bỉm bán chạy", source: "manual", limit: 6, items: mombabyItems() }),
        block("news", {
          title: "Cẩm nang chăm bé",
          items: items([
            { label: "Cách chọn sữa công thức phù hợp cho bé sơ sinh", sub: "Bác sĩ dinh dưỡng · 3 giờ trước", image: FREEPIK_STOCK.mombaby.banner2, color: "#db2777" },
            { label: "Checklist 20 món đồ đi sinh gọn nhẹ cho mẹ bầu", sub: "Hôm qua", image: FREEPIK_STOCK.mombaby.products[5], color: "#ec4899" },
          ]),
        }),
      ]),
      page("Ưu đãi", "/deals", "gift", [block("voucherList"), block("flashSale", { source: "manual", limit: 6, items: mombabyItems() })]),
      accountPage(brand),
    ],
  },
  {
    id: "gift",
    code: "T12",
    name: "Tiệm Quà tặng & Đồ thêu",
    category: "Bán lẻ & Thời trang",
    industry: "Quà tặng · Cá nhân hoá",
    description: "Chọn quà theo dịp, đặt thêu tên theo yêu cầu & viết thiệp kèm hộp quà",
    theme: { primary: "#e11d48", accent: "#fb7185", bg: "#fff7f8", radius: 18, font: "Be Vietnam Pro", tabbarStyle: "minimal" },
    build: (brand) => [
      page("Trang chủ", "/", "home", [
        block("header", { title: brand, subtitle: "Hộp quà tinh tế · Khắc & thêu tên theo yêu cầu", verified: true, variant: "pastel" }),
        block("banner", {
          items: items([
            { label: "Set Quà Tặng Cá Nhân Hoá", sub: "Miễn phí thêu tên & viết thiệp tay", badge: "GIFT BOX", image: FREEPIK_STOCK.gift.banner1, color: "#e11d48", colorTo: "#f59e0b" },
            { label: "Quà Tặng Doanh Nghiệp", sub: "Chiết khấu đến 30% cho đơn số lượng lớn", badge: "B2B", image: FREEPIK_STOCK.gift.banner2, color: "#be123c", colorTo: "#fb7185" },
          ]),
        }),
        block("categories", { title: "Chọn theo dịp", items: items([{ label: "Sinh nhật" }, { label: "Kỷ niệm" }, { label: "Cảm ơn" }, { label: "Doanh nghiệp" }]) }),
        block("productGrid", { title: "Hộp quà được yêu thích", source: "manual", limit: 6, items: giftItems() }),
        block("form", {
          title: "Đặt thêu tên / Viết lời chúc",
          subtitle: "Nhập nội dung thêu hoặc lời chúc in trên thiệp",
          ctaLabel: "Gửi yêu cầu thiết kế",
          items: items([
            { label: "Nội dung thêu / khắc", sub: "VD: Happy Birthday Minh Anh" },
            { label: "Màu chỉ / Phong cách", sub: "VD: Vàng đồng · Font chữ viết tay" },
            { label: "Số điện thoại nhận mẫu", sub: "09xx xxx xxx" },
          ]),
        }),
      ]),
      page("Ưu đãi", "/deals", "gift", [block("voucherList")]),
      accountPage(brand),
    ],
  },
  {
    id: "hotel",
    code: "T09",
    name: "Khách sạn & Resort",
    category: "Dịch vụ & Du lịch",
    industry: "Khách sạn · Homestay",
    description: "Tìm phòng nghỉ dưỡng, đặt phòng nhanh, tiện ích & ưu đãi thành viên",
    theme: { primary: "#0369a1", accent: "#0ea5e9", bg: "#f0f9ff", radius: 18, font: "Inter", tabbarStyle: "floating" },
    build: (brand) => [
      page("Trang chủ", "/", "home", [
        block("header", { title: brand, subtitle: "Nghỉ dưỡng đẳng cấp · Đặt phòng trực tiếp giá tốt", verified: true, variant: "solid" }),
        block("banner", {
          items: items([
            { label: "Ưu Đãi Nghỉ Dưỡng Cuối Tuần", sub: "Giảm 25% + Miễn phí buffet sáng 2 khách", badge: "-25%", image: FREEPIK_STOCK.hotel.banner1, color: "#0369a1", colorTo: "#0284c7" },
            { label: "Check-in Sớm Miễn Phí", sub: "Dành riêng cho khách đặt qua Zalo Mini App", badge: "VIP", image: FREEPIK_STOCK.hotel.banner2, color: "#0f766e", colorTo: "#0ea5e9" },
          ]),
        }),
        block("booking", { title: "Chọn ngày nhận phòng", subtitle: "Cam kết giá tốt nhất khi đặt trực tiếp", ctaLabel: "Kiểm tra phòng trống" }),
        block("productList", {
          title: "Hạng phòng & Combo nghỉ dưỡng",
          ctaLabel: "Đặt phòng",
          source: "manual",
          limit: 6,
          items: hotelItems(),
        }),
      ]),
      page("Hạng phòng", "/rooms", "grid", [
        block("productGrid", { title: "Tất cả hạng phòng", source: "manual", limit: 6, showViewAll: false, items: hotelItems() }),
      ]),
      page("Đặt phòng", "/booking", "calendar", [block("booking", { title: "Đặt phòng trực tiếp" }), block("contact")]),
      accountPage(brand),
    ],
  },
  {
    id: "realestate",
    code: "T10",
    name: "Bất động sản",
    category: "Dịch vụ & Du lịch",
    industry: "Bất động sản · Dự án",
    description: "Giới thiệu dự án nổi bật, đăng ký tham quan nhà mẫu & nhận bảng giá",
    theme: { primary: "#1e3a5f", accent: "#d97706", bg: "#f8fafc", radius: 14, font: "Inter", tabbarStyle: "classic" },
    build: (brand) => [
      page("Trang chủ", "/", "home", [
        block("header", { title: brand, subtitle: "Phân phối dự án uy tín · Tư vấn 1:1", verified: true, variant: "solid" }),
        block("search", { placeholder: "Tìm dự án, quận/huyện, phân khúc..." }),
        block("banner", {
          items: items([
            { label: "Mở Bán Phân Khu Mới 2026", sub: "Chiết khấu thanh toán sớm lên đến 12%", badge: "HOT", image: FREEPIK_STOCK.realestate.banner1, color: "#1e3a5f", colorTo: "#d97706" },
            { label: "Tham Quan Nhà Mẫu Cuối Tuần", sub: "Xe đưa đón miễn phí + Bộ quà tặng VIP", badge: "EVENT", image: FREEPIK_STOCK.realestate.banner2, color: "#0f172a", colorTo: "#1e3a5f" },
          ]),
        }),
        block("productList", {
          title: "Dự án đang mở bán",
          ctaLabel: "Xem giá",
          source: "manual",
          limit: 6,
          items: realestateItems(),
        }),
        block("form", {
          title: "Đăng ký nhận bảng giá & lịch xem nhà mẫu",
          ctaLabel: "Nhận bảng giá qua Zalo",
        }),
      ]),
      page("Dự án", "/projects", "grid", [
        block("productGrid", { title: "Giỏ hàng độc quyền", source: "manual", limit: 6, showViewAll: false, items: realestateItems() }),
      ]),
      page("Liên hệ", "/contact", "map", [block("contact")]),
      accountPage(brand),
    ],
  },
  {
    id: "legal",
    code: "T17",
    name: "Pháp lý & Công chứng",
    category: "Pháp lý & Giáo dục",
    industry: "Công chứng · Luật sư",
    description: "Checklist hồ sơ, đặt lịch luật sư/công chứng viên & chính sách biểu phí",
    theme: { primary: "#1e3a8a", accent: "#ca8a04", bg: "#f8fafc", radius: 14, font: "Inter", tabbarStyle: "classic" },
    build: (brand) => [
      page("Trang chủ", "/", "home", [
        block("header", { title: brand, subtitle: "Chính xác · Bảo mật · Hỗ trợ tận nơi", verified: true, variant: "solid" }),
        block("banner", {
          items: items([
            { label: "Công Chứng Nhanh Không Chờ Đợi", sub: "Gửi trước ảnh hồ sơ · Ký trong 15 phút", badge: "NHANH", image: FREEPIK_STOCK.legal.banner1, color: "#1e3a8a", colorTo: "#1d4ed8" },
            { label: "Tư Vấn Pháp Lý Doanh Nghiệp", sub: "Đội ngũ luật sư 15+ năm kinh nghiệm", badge: "1:1", image: FREEPIK_STOCK.legal.banner2, color: "#0f172a", colorTo: "#ca8a04" },
          ]),
        }),
        block("quickActions", {
          items: items([
            { label: "Đặt lịch ký", icon: "calendar", color: "#1e3a8a" },
            { label: "Hồ sơ mẫu", icon: "file", color: "#0284c7" },
            { label: "Tính phí", icon: "wallet", color: "#ca8a04" },
            { label: "Tư vấn OA", icon: "message", color: "#10b981" },
          ]),
        }),
        block("productList", {
          title: "Dịch vụ pháp lý & công chứng",
          ctaLabel: "Đặt lịch",
          source: "manual",
          limit: 4,
          items: legalItems(),
        }),
        block("booking", { title: "Đặt lịch công chứng / tư vấn", subtitle: "Chọn khung giờ để chuyên viên chuẩn bị trước hồ sơ", ctaLabel: "Đặt lịch ngay" }),
        block("policyList", { title: "Danh mục thủ tục & Biểu phí" }),
      ]),
      page("Gửi hồ sơ", "/submit", "upload", [
        block("form", {
          title: "Gửi ảnh hồ sơ kiểm tra trước",
          subtitle: "Công chứng viên kiểm tra miễn phí và báo giấy tờ còn thiếu",
          ctaLabel: "Gửi kiểm tra",
        }),
        block("contact"),
      ]),
      accountPage(brand),
    ],
  },
  {
    id: "education",
    code: "T08",
    name: "Trường học & Trung tâm",
    category: "Pháp lý & Giáo dục",
    industry: "Giáo dục · Đào tạo",
    description: "Khoá học nổi bật, sổ liên lạc điện tử, lịch học & đăng ký học thử",
    theme: { primary: "#4f46e5", accent: "#06b6d4", bg: "#f5f7ff", radius: 16, font: "Inter", tabbarStyle: "indicator" },
    build: (brand) => [
      page("Trang chủ", "/", "home", [
        block("header", { title: brand, subtitle: "Cổng kết nối Phụ huynh & Nhà trường", verified: true, variant: "solid" }),
        block("notice", { title: "Thông báo: Mở đăng ký học thử miễn phí khoá mới tháng này" }),
        block("banner", {
          items: items([
            { label: "Tuyển Sinh Khoá Mới 2026", sub: "Ưu đãi 20% học phí khi đăng ký sớm qua Zalo", badge: "-20%", image: FREEPIK_STOCK.education.banner1, color: "#4f46e5", colorTo: "#06b6d4" },
            { label: "Học Thử Miễn Phí & Test Đầu Vào", sub: "Nhận lộ trình học tập cá nhân hoá 1:1", badge: "FREE", image: FREEPIK_STOCK.education.banner2, color: "#3730a3", colorTo: "#4f46e5" },
          ]),
        }),
        block("quickActions", {
          items: items([
            { label: "Lịch học", icon: "calendar", color: "#4f46e5" },
            { label: "Điểm số", icon: "star", color: "#f59e0b" },
            { label: "Học phí", icon: "wallet", color: "#10b981" },
            { label: "Xin nghỉ", icon: "file", color: "#e11d48" },
          ]),
        }),
        block("productGrid", {
          title: "Khoá học & Chương trình đào tạo",
          source: "manual",
          limit: 6,
          items: educationItems(),
        }),
        block("news", {
          title: "Tin tức & Hoạt động trường",
          items: items([
            { label: "Lễ tổng kết & trao học bổng học kỳ I năm học 2026", sub: "Phòng Đào tạo · 2 giờ trước", image: FREEPIK_STOCK.education.banner1, color: "#4f46e5" },
            { label: "Hội thảo kỹ năng đồng hành cùng con học tiếng Anh", sub: "Hôm qua", image: FREEPIK_STOCK.education.banner2, color: "#06b6d4" },
          ]),
        }),
      ]),
      page("Đăng ký", "/register", "file", [
        block("form", {
          title: "Đăng ký học thử / Xin nghỉ phép",
          subtitle: "Gửi trực tiếp tới giáo viên chủ nhiệm qua Zalo",
          ctaLabel: "Gửi thông tin",
        }),
        block("contact"),
      ]),
      accountPage(brand),
    ],
  },
  {
    id: "billiards",
    code: "T15",
    name: "Quán Bida & Giải trí",
    category: "Dịch vụ & Du lịch",
    industry: "Billiards · Giải trí",
    description: "Đặt bàn theo giờ, gọi đồ uống lên bàn & bảng xếp hạng cơ thủ",
    theme: { primary: "#0b6e4f", accent: "#f59e0b", bg: "#f2f8f5", radius: 16, font: "Inter", tabbarStyle: "floating" },
    build: (brand) => [
      page("Trang chủ", "/", "home", [
        block("header", { title: brand, subtitle: "Bàn chuẩn thi đấu · Đặt bàn giữ chỗ ngay", verified: true, variant: "solid" }),
        block("banner", {
          items: items([
            { label: "Giờ Vàng Cơ Thủ -30%", sub: "Áp dụng khung giờ 09:00 – 16:00 hằng ngày", badge: "HAPPY HOUR", image: FREEPIK_STOCK.billiards.banner1, color: "#0b6e4f", colorTo: "#0f766e" },
            { label: "Giải Đấu Mở Rộng Tháng 11", sub: "Tổng giải thưởng 20 triệu đồng · Đăng ký ngay", badge: "TOURNAMENT", image: FREEPIK_STOCK.billiards.banner2, color: "#111827", colorTo: "#0b6e4f" },
          ]),
        }),
        block("booking", { title: "Đặt bàn Bida nhanh", subtitle: "Chọn khung giờ & loại bàn (Pool / Carom)", ctaLabel: "Giữ bàn ngay" }),
        block("productGrid", {
          title: "Combo giờ chơi & Gọi đồ lên bàn",
          source: "manual",
          limit: 6,
          items: billiardsItems(),
        }),
      ]),
      page("Ưu đãi", "/deals", "ticket", [block("voucherList"), block("contact")]),
      accountPage(brand),
    ],
  },
  {
    id: "barber",
    code: "T21",
    name: "Tiệm cắt tóc / Barber",
    category: "Y tế & Làm đẹp",
    industry: "Barber · Cắt tóc nam",
    description: "Bảng giá cắt – cạo – uốn – nhuộm, đặt lịch chọn thợ, ưu đãi thẻ tích lần cắt",
    theme: { primary: "#1f2937", accent: "#c08a3e", bg: "#f5f4f1", radius: 16, font: "Inter", tabbarStyle: "classic", appBarStyle: "transparent" },
    build: (brand) => [
      page("Trang chủ", "/", "home", [
        block("header", { title: brand, subtitle: "Cắt tóc nam · Cạo râu khăn nóng", verified: true, variant: "solid" }),
        block("banner", {
          items: items([
            { label: "Cắt + gội chỉ 120K", sub: "Thứ 2 – Thứ 5, trước 17h", badge: "ƯU ĐÃI", image: FREEPIK_STOCK.barber.banner1, color: "#111827", colorTo: "#4b5563" },
            { label: "Cạo mặt khăn nóng", sub: "Thư giãn kiểu quý ông", badge: "MỚI", image: FREEPIK_STOCK.barber.banner2, color: "#7c2d12", colorTo: "#c08a3e" },
          ]),
        }),
        block("booking", { title: "Đặt lịch cắt tóc", subtitle: "Chọn giờ – không phải chờ", ctaLabel: "Giữ chỗ" }),
        block("productList", {
          title: "Bảng giá dịch vụ",
          ctaLabel: "Đặt",
          source: "manual",
          limit: 6,
          items: items([
            { label: "Cắt tóc nam tạo kiểu", sub: "30 phút · tư vấn kiểu theo khuôn mặt", price: 80000, badge: "HOT", image: FREEPIK_STOCK.barber.products[0] },
            { label: "Combo cắt + gội + ráy tai", sub: "50 phút · đắp khăn nóng", price: 120000, oldPrice: 150000, image: FREEPIK_STOCK.barber.products[1] },
            { label: "Cạo mặt khăn nóng", sub: "25 phút · dao cạo thẳng", price: 60000, image: FREEPIK_STOCK.barber.products[2] },
            { label: "Cắt kéo Undercut / Side part", sub: "40 phút · fade sắc nét", price: 100000, image: FREEPIK_STOCK.barber.products[3] },
            { label: "Nhuộm thời trang", sub: "75 phút · nâu khói, xám khói", price: 300000, image: FREEPIK_STOCK.barber.products[4] },
            { label: "Tỉa & tạo kiểu râu", sub: "20 phút · dưỡng dầu râu", price: 50000, image: FREEPIK_STOCK.barber.products[5] },
          ]),
        }),
      ]),
      page("Đặt lịch", "/booking", "calendar", [
        block("booking", { title: "Chọn khung giờ", subtitle: "Tiệm xác nhận qua Zalo trong 5 phút" }),
        block("form", { title: "Thông tin đặt lịch", ctaLabel: "Xác nhận đặt lịch" }),
      ]),
      page("Ưu đãi", "/deals", "ticket", [block("voucherList"), block("contact")]),
      accountPage(brand),
    ],
  },
  {
    id: "nail",
    code: "T22",
    name: "Tiệm Nail",
    category: "Y tế & Làm đẹp",
    industry: "Nail · Mi · Chăm sóc tay chân",
    description: "Bảng giá sơn gel, vẽ, đắp móng; đặt lịch theo giờ, mẫu nail hot & tích điểm",
    theme: { primary: "#db2777", accent: "#f9a8d4", bg: "#fdf4f8", radius: 22, font: "Be Vietnam Pro", tabbarStyle: "minimal", appBarStyle: "transparent" },
    build: (brand) => [
      page("Trang chủ", "/", "home", [
        block("header", { title: brand, subtitle: "Nail · Mi · Chăm sóc da tay chân", verified: true, variant: "solid" }),
        block("banner", {
          variant: "split",
          items: items([
            { label: "Sơn gel chỉ 120K", sub: "Tặng dưỡng móng cho khách mới", badge: "-20%", image: FREEPIK_STOCK.nail.banner1, color: "#db2777", colorTo: "#f9a8d4" },
            { label: "Mẫu nail mới đã có", sub: "Vẽ tay, đính đá theo yêu cầu", badge: "NEW", image: FREEPIK_STOCK.nail.banner2, color: "#a21caf", colorTo: "#f0abfc" },
          ]),
        }),
        block("booking", { title: "Đặt lịch làm nail", ctaLabel: "Giữ chỗ" }),
        block("productGrid", {
          title: "Dịch vụ nổi bật",
          source: "manual",
          limit: 6,
          items: items([
            { label: "Sơn gel trơn Hàn Quốc", sub: "Bền màu 3–4 tuần", price: 120000, oldPrice: 150000, badge: "HOT", image: FREEPIK_STOCK.nail.products[1] },
            { label: "Vẽ nail art theo mẫu", sub: "Ombre, mắt mèo, tráng gương", price: 250000, image: FREEPIK_STOCK.nail.products[0] },
            { label: "Đắp gel / úp móng", sub: "Form vuông, oval, nhọn", price: 350000, image: FREEPIK_STOCK.nail.products[2] },
            { label: "Sơn gel chân + cắt da", sub: "Ngâm chân thảo dược", price: 160000, image: FREEPIK_STOCK.nail.products[3] },
            { label: "Chăm sóc da tay paraffin", sub: "Ủ sáp, massage tay", price: 180000, image: FREEPIK_STOCK.nail.products[4] },
            { label: "Tháo gel + dưỡng móng", sub: "Không hại móng thật", price: 60000, image: FREEPIK_STOCK.nail.products[5] },
          ]),
        }),
      ]),
      page("Đặt lịch", "/booking", "calendar", [
        block("booking", { title: "Chọn khung giờ", subtitle: "Gửi ảnh mẫu qua Zalo để thợ chuẩn bị" }),
        block("form", { title: "Thông tin đặt lịch", ctaLabel: "Xác nhận đặt lịch" }),
      ]),
      page("Liên hệ", "/contact", "map", [block("contact"), block("policyList", { title: "Chính sách bảo hành nail" })]),
      accountPage(brand),
    ],
  },
  {
    id: "netcafe",
    code: "T24",
    name: "Tiệm net / Cyber Game",
    category: "Dịch vụ & Du lịch",
    industry: "Cyber game · Esports",
    description: "Giá giờ chơi theo khu máy, đặt máy trước, nạp ví, combo đồ ăn & giải đấu",
    theme: { primary: "#7c3aed", accent: "#22d3ee", bg: "#f3f1fa", radius: 16, font: "Inter", tabbarStyle: "floating", tabbarBg: "#1e1b4b" },
    build: (brand) => [
      page("Trang chủ", "/", "home", [
        block("header", { title: brand, subtitle: "Cyber game 24/7 · RTX 40 series", verified: true, variant: "solid" }),
        block("banner", {
          items: items([
            { label: "Nạp 200K tặng 30K", sub: "Áp dụng mọi khu máy", badge: "KHUYẾN MÃI", image: FREEPIK_STOCK.netcafe.banner1, color: "#4c1d95", colorTo: "#7c3aed" },
            { label: "Giải LMHT 5v5 cuối tuần", sub: "Giải thưởng 10 triệu · đăng ký theo đội", badge: "GIẢI ĐẤU", image: FREEPIK_STOCK.netcafe.banner2, color: "#0e7490", colorTo: "#22d3ee" },
          ]),
        }),
        block("booking", { title: "Đặt máy trước", subtitle: "Giữ máy 15 phút sau giờ hẹn", ctaLabel: "Giữ máy" }),
        block("productGrid", {
          title: "Khu máy & combo",
          source: "manual",
          limit: 6,
          items: items([
            { label: "Khu thường · 10K/giờ", sub: "RTX 3060 · 144Hz", price: 10000, image: FREEPIK_STOCK.netcafe.products[0] },
            { label: "Khu VIP · 15K/giờ", sub: "RTX 4070 · 240Hz · ghế DXRacer", price: 15000, badge: "VIP", image: FREEPIK_STOCK.netcafe.products[1] },
            { label: "Phòng thi đấu 5v5", sub: "Phòng kín 5 máy · 360Hz", price: 90000, badge: "TEAM", image: FREEPIK_STOCK.netcafe.products[2] },
            { label: "Phòng stream / đôi", sub: "2 máy RTX 4080 · mic, cam", price: 25000, image: FREEPIK_STOCK.netcafe.products[3] },
            { label: "Combo 5 giờ + mì xào", sub: "Khu thường", price: 79000, oldPrice: 85000, badge: "COMBO", image: FREEPIK_STOCK.netcafe.products[4] },
            { label: "Thuê gear thi đấu", sub: "Tai nghe, chuột, bàn phím cơ", price: 20000, image: FREEPIK_STOCK.netcafe.products[5] },
          ]),
        }),
      ]),
      page("Ưu đãi", "/deals", "ticket", [block("voucherList"), block("contact")]),
      accountPage(brand),
    ],
  },
  {
    id: "kcn",
    code: "T19",
    name: "Doanh nghiệp & Nhà máy KCN",
    category: "Doanh nghiệp & KCN",
    industry: "Khu công nghiệp · Nhân sự",
    description: "Chấm công & OT, nộp ảnh giấy tờ HR, báo cáo 5S, hòm thư ẩn danh",
    theme: { primary: "#0f4c81", accent: "#14b8a6", bg: "#f1f5f9", radius: 14, font: "Inter", tabbarStyle: "classic", appBarStyle: "transparent" },
    build: (brand) => [
      page("Trang chủ", "/", "home", [
        block("header", { title: brand, subtitle: "Cổng thông tin nội bộ · Khu công nghiệp", verified: true, variant: "solid" }),
        block("notice", { title: "Lịch nghỉ Tết Dương lịch: 01/01 – Toàn công ty" }),
        block("quickActions", {
          title: "Dịch vụ nội bộ",
          columns: 4,
          variant: "solid",
          items: items([
            { label: "Chấm công", icon: "fingerprint", color: "#0f4c81" },
            { label: "Nộp giấy tờ", icon: "upload", color: "#14b8a6" },
            { label: "Báo cáo", icon: "clipboard", color: "#f59e0b" },
            { label: "Hòm thư", icon: "mail", color: "#8b5cf6" },
            { label: "Hỏi đáp", icon: "help", color: "#0ea5e9" },
            { label: "Phiếu lương", icon: "wallet", color: "#10b981" },
            { label: "An toàn LĐ", icon: "shield", color: "#e11d48" },
            { label: "Thông báo", icon: "bell", color: "#64748b" },
          ]),
        }),
        block("banner", {
          items: items([
            { label: "An toàn lao động 2026", sub: "Tuân thủ quy chuẩn 5S tại xưởng sản xuất", badge: "NỘI BỘ", image: FREEPIK_STOCK.kcn.banner1, color: "#0f4c81", colorTo: "#14b8a6" },
            { label: "Thi đua năng suất Quý IV", sub: "Thưởng nóng cho tổ sản xuất xuất sắc", badge: "SỰ KIỆN", image: FREEPIK_STOCK.kcn.banner2, color: "#0284c7", colorTo: "#0f4c81" },
          ]),
        }),
        block("news", {
          title: "Bản tin doanh nghiệp",
          items: items([
            { label: "Quy định mới về an toàn lao động khu vực xưởng B", sub: "Phòng HCNS · 1 giờ trước", image: FREEPIK_STOCK.kcn.news1, color: "#0f4c81" },
            { label: "Kết quả thi đua quý IV – Tổ sản xuất số 3", sub: "Công đoàn · Hôm qua", image: FREEPIK_STOCK.kcn.news2, color: "#14b8a6" },
          ]),
        }),
      ]),
      page("Chấm công", "/attendance", "fingerprint", [
        block("memberCard", { title: "Ca hành chính 08:00 – 17:00", subtitle: "Đã làm 22/26 công tháng này", variant: "minimal", ctaLabel: "Check-in" }),
        block("menuList", {
          title: "Lịch sử chấm công",
          items: items([
            { label: "Hôm nay", sub: "07:52 · Đúng giờ", icon: "clock", color: "#10b981" },
            { label: "Hôm qua", sub: "08:05 · Muộn 5p", icon: "clock", color: "#f59e0b" },
          ]),
        }),
      ]),
      page("Hồ sơ", "/documents", "file", [
        block("form", {
          title: "Nộp ảnh giấy tờ",
          subtitle: "CCCD, giấy khám sức khoẻ, bằng cấp...",
          ctaLabel: "Tải lên & Gửi",
          items: items([
            { label: "Loại giấy tờ", sub: "Chọn loại giấy tờ" },
            { label: "Ảnh mặt trước", sub: "Chụp hoặc chọn ảnh" },
            { label: "Ghi chú", sub: "Nội dung bổ sung" },
          ]),
        }),
      ]),
      page("Hòm thư", "/mailbox", "mail", [
        block("form", { title: "Hòm thư góp ý", subtitle: "Ẩn danh 100% – gửi trực tiếp Ban Giám đốc", ctaLabel: "Gửi góp ý" }),
        block("policyList", { title: "Nội quy & Quy định nhân sự" }),
      ]),
      accountPage(brand),
    ],
  },
];

export function createSchemaFromPreset(presetId: string, brand: string, overrides?: Partial<BuilderTheme>): BuilderSchema {
  const preset = PRESETS.find((p) => p.id === presetId) ?? PRESETS[0];
  return {
    version: 1,
    presetId: preset.id,
    appName: brand,
    theme: { ...preset.theme, ...overrides },
    pages: preset.build(brand),
    updatedAt: new Date().toISOString(),
  };
}

export function guessPresetId(templateId: string): string {
  const t = templateId.toLowerCase();
  if (t.includes("kcn") || t.includes("co_quan")) return "kcn";
  if (t.includes("nha_hang")) return "restaurant";
  if (t.includes("fnb") || t.includes("cafe")) return "fnb";
  if (t.includes("sieu_am") || t.includes("phong_kham")) return "clinic";
  if (t.includes("cat_toc") || t.includes("barber")) return "barber";
  if (t.includes("nail")) return "nail";
  if (t.includes("tiem_net") || t.includes("cyber")) return "netcafe";
  if (t.includes("spa")) return "spa";
  if (t.includes("sieu_thi")) return "supermarket";
  if (t.includes("me_va_be")) return "mombaby";
  if (t.includes("qua_tang") || t.includes("do_theu")) return "gift";
  if (t.includes("khach_san")) return "hotel";
  if (t.includes("bat_dong_san")) return "realestate";
  if (t.includes("cong_chung") || t.includes("luat")) return "legal";
  if (t.includes("truong_hoc")) return "education";
  if (t.includes("bida")) return "billiards";
  return "retail";
}

export function cloneBlock(b: Block): Block {
  return {
    ...b,
    id: uid(b.type.slice(0, 3)),
    props: { ...b.props, items: b.props.items?.map((it) => ({ ...it, id: uid("i") })) },
  };
}
