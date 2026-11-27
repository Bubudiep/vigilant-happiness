import { FREEPIK_STOCK } from "./stock-images";
import type { BlockProps, BlockType, FieldDef, ItemFieldDef } from "./types";

export const uid = (p = "b") => `${p}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`;

export interface BlockMeta {
  type: BlockType;
  label: string;
  icon: string;
  category: "Bố cục" | "Thương mại" | "Nội dung" | "Tiện ích";
  description: string;
  defaults: () => BlockProps;
  fields: FieldDef[];
  itemFields?: ItemFieldDef[];
  itemLabel?: string;
}

const styleFields: FieldDef[] = [
  { key: "bgColor", label: "Màu nền khối", kind: "color", group: "style" },
  { key: "paddingY", label: "Khoảng cách dọc", kind: "slider", min: 0, max: 32, group: "style" },
];

const titleFields: FieldDef[] = [
  { key: "title", label: "Tiêu đề", kind: "text" },
  { key: "showViewAll", label: "Hiện nút \"Xem tất cả\"", kind: "switch" },
];

/** Thuộc tính hiển thị của Thẻ thành viên — mỗi kiểu thẻ có bộ riêng */
const isVip = (p: BlockProps) => (p.variant ?? "vip") === "vip";
const isMinimal = (p: BlockProps) => p.variant === "minimal";
const isStamp = (p: BlockProps) => p.variant === "stamp";
const only = (showIf: (p: BlockProps) => boolean, fields: FieldDef[]): FieldDef[] => fields.map((f) => ({ ...f, group: "style", showIf }));
const radiusField = (fallback: number): FieldDef => ({ key: "cardRadius", label: "Bo góc thẻ", kind: "slider", min: 0, max: 32, unit: "px", fallback });

const memberCardStyleFields: FieldDef[] = [
  ...only(isVip, [
    { key: "gradientFrom", label: "Màu bắt đầu", kind: "color", fallback: "#0f172a" },
    { key: "gradientTo", label: "Màu kết thúc", kind: "color", fallback: (t) => t.primary },
    { key: "gradientAngle", label: "Góc chuyển màu", kind: "slider", min: 0, max: 360, step: 5, unit: "°", fallback: 135 },
    { key: "cardTextColor", label: "Màu chữ", kind: "color", fallback: "#ffffff" },
    { key: "cardBarColor", label: "Màu thanh điểm", kind: "color", fallback: (t) => t.accent },
    { key: "cardButtonColor", label: "Màu nút", kind: "color" },
    { key: "cardDecor", label: "Vòng tròn trang trí", kind: "switch", fallback: true },
    radiusField(20),
  ]),
  ...only(isMinimal, [
    { key: "cardBg", label: "Màu nền thẻ", kind: "color", fallback: "#ffffff" },
    { key: "cardTextColor", label: "Màu chữ", kind: "color", fallback: "#0f172a" },
    { key: "cardBarColor", label: "Màu thanh điểm", kind: "color", fallback: (t) => t.accent },
    { key: "cardButtonColor", label: "Màu nút", kind: "color", fallback: (t) => t.primary },
    radiusField(20),
  ]),
  ...only(isStamp, [
    { key: "stampCount", label: "Số tem", kind: "slider", min: 2, max: 50, fallback: 10 },
    { key: "stampIcon", label: "Biểu tượng tem", kind: "stampIcon", fallback: "coffee" },
    { key: "stampIconImage", label: "Hoặc tải biểu tượng riêng", kind: "iconImage" },
    { key: "stampRewardImage", label: "Biểu tượng ô quà cuối (mặc định hộp quà)", kind: "iconImage" },
    {
      key: "stampShape",
      label: "Hình dạng ô tem",
      kind: "select",
      fallback: "circle",
      options: [
        { value: "circle", label: "Tròn" },
        { value: "rounded", label: "Bo góc" },
        { value: "square", label: "Vuông" },
      ],
    },
    { key: "stampSize", label: "Cỡ ô tem", kind: "slider", min: 22, max: 64, unit: "px", fallback: 32 },
    { key: "stampIconSize", label: "Cỡ biểu tượng", kind: "slider", min: 8, max: 40, unit: "px", fallback: 14 },
    { key: "stampGap", label: "Khoảng cách giữa các ô", kind: "slider", min: 0, max: 20, unit: "px", fallback: 8 },
    { key: "stampItemBg", label: "Nền ô đã tích", kind: "color", fallback: (t) => t.primary },
    { key: "stampIconColor", label: "Biểu tượng đã tích", kind: "color", fallback: "#ffffff" },
    { key: "stampEmptyBg", label: "Nền ô chưa tích", kind: "color", fallback: "#f1f5f9" },
    { key: "stampEmptyIconColor", label: "Biểu tượng chưa tích", kind: "color", fallback: "#cbd5e1" },
    { key: "cardBg", label: "Màu nền thẻ", kind: "color", fallback: "#ffffff" },
    { key: "cardTextColor", label: "Màu chữ", kind: "color", fallback: "#0f172a" },
    { key: "cardButtonColor", label: "Màu nút", kind: "color", fallback: (t) => t.primary },
    { key: "cardBorderColor", label: "Màu viền", kind: "color", fallback: (t) => t.primary },
    radiusField(16),
  ]),
];

export const BLOCKS: Record<BlockType, BlockMeta> = {
  header: {
    type: "header",
    label: "Header thương hiệu",
    icon: "home",
    category: "Bố cục",
    description: "Tràn full lên AppBar: Logo, tên, tick xanh và subtitle",
    defaults: () => ({
      title: "Tên cửa hàng",
      subtitle: "Mô tả ngắn · Giao nhanh nội thành",
      logoUrl: "",
      verified: true,
      variant: "pastel",
    }),
    fields: [
      { key: "title", label: "Tên thương hiệu (Name)", kind: "text" },
      { key: "subtitle", label: "Mô tả phụ (Subtitle)", kind: "text" },
      { key: "logoUrl", label: "Ảnh Logo (tải lên hoặc URL)", kind: "image" },
      { key: "verified", label: "Hiện tick xanh xác thực", kind: "switch" },
      {
        key: "variant",
        label: "Kiểu nền Header",
        kind: "select",
        options: [
          { value: "pastel", label: "Pastel nhẹ" },
          { value: "solid", label: "Gradient đậm" },
          { value: "clean", label: "Trắng tối giản" },
        ],
      },
      ...styleFields,
    ],
  },
  search: {
    type: "search",
    label: "Thanh tìm kiếm",
    icon: "grid",
    category: "Bố cục",
    description: "Ô tìm kiếm sản phẩm / dịch vụ",
    defaults: () => ({ placeholder: "Tìm sản phẩm, dịch vụ..." }),
    fields: [{ key: "placeholder", label: "Placeholder", kind: "text" }, ...styleFields],
  },
  notice: {
    type: "notice",
    label: "Thanh thông báo",
    icon: "megaphone",
    category: "Nội dung",
    description: "Dòng thông báo / khuyến mãi nổi bật",
    defaults: () => ({ title: "Freeship cho đơn từ 299K – Áp dụng đến hết tháng" }),
    fields: [{ key: "title", label: "Nội dung", kind: "textarea" }, ...styleFields],
  },
  banner: {
    type: "banner",
    label: "Banner Slider",
    icon: "camera",
    category: "Bố cục",
    description: "Slider banner tự động chạy",
    defaults: () => ({
      height: 150,
      radius: 18,
      autoplay: true,
      variant: "editorial",
      items: [
        {
          id: uid("s"),
          label: "Bộ sưu tập mới",
          sub: "Giảm đến 30% cho thành viên",
          badge: "NEW",
          image: FREEPIK_STOCK.retail.banner1,
          color: "#1657f3",
          colorTo: "#7c3aed",
        },
        {
          id: uid("s"),
          label: "Ưu đãi cuối tuần",
          sub: "Mua 2 tặng 1 toàn bộ cửa hàng",
          badge: "HOT",
          image: FREEPIK_STOCK.retail.banner2,
          color: "#f97316",
          colorTo: "#e11d48",
        },
      ],
    }),
    fields: [
      {
        key: "variant",
        label: "Kiểu banner",
        kind: "select",
        options: [
          { value: "editorial", label: "Editorial" },
          { value: "poster", label: "Poster tràn" },
          { value: "split", label: "Chia đôi" },
        ],
      },
      { key: "height", label: "Chiều cao", kind: "slider", min: 100, max: 240 },
      { key: "radius", label: "Bo góc", kind: "slider", min: 0, max: 28 },
      { key: "autoplay", label: "Tự động chạy", kind: "switch" },
      ...styleFields,
    ],
    itemLabel: "Slide",
    itemFields: [
      { key: "image", label: "Ảnh nền Slide", kind: "image" },
      { key: "badge", label: "Nhãn", kind: "text" },
      { key: "label", label: "Tiêu đề", kind: "text" },
      { key: "sub", label: "Mô tả", kind: "text" },
      { key: "color", label: "Màu đầu (khi không dùng ảnh)", kind: "color" },
      { key: "colorTo", label: "Màu cuối", kind: "color" },
    ],
  },
  quickActions: {
    type: "quickActions",
    label: "Lối tắt nhanh",
    icon: "zap",
    category: "Tiện ích",
    description: "Lưới icon tính năng nhanh",
    defaults: () => ({
      columns: 4,
      variant: "soft",
      items: [
        { id: uid("q"), label: "Ưu đãi", icon: "gift", color: "#f43f5e" },
        { id: uid("q"), label: "Đặt lịch", icon: "calendar", color: "#0ea5e9" },
        { id: uid("q"), label: "Tích điểm", icon: "star", color: "#f59e0b" },
        { id: uid("q"), label: "Voucher", icon: "ticket", color: "#8b5cf6" },
      ],
    }),
    fields: [
      { key: "title", label: "Tiêu đề (tuỳ chọn)", kind: "text" },
      { key: "columns", label: "Số cột", kind: "slider", min: 3, max: 5 },
      {
        key: "variant",
        label: "Kiểu icon",
        kind: "select",
        options: [
          { value: "soft", label: "Nền nhạt" },
          { value: "solid", label: "Nền đậm" },
          { value: "outline", label: "Viền" },
        ],
      },
      ...styleFields,
    ],
    itemLabel: "Lối tắt",
    itemFields: [
      { key: "label", label: "Tên", kind: "text" },
      { key: "icon", label: "Icon", kind: "icon" },
      { key: "color", label: "Màu", kind: "color" },
    ],
  },
  categories: {
    type: "categories",
    label: "Danh mục ngang",
    icon: "grid",
    category: "Thương mại",
    description: "Chip danh mục cuộn ngang",
    defaults: () => ({
      title: "Danh mục",
      items: ["Tất cả", "Mới về", "Bán chạy", "Giảm giá", "Phụ kiện"].map((label) => ({ id: uid("c"), label })),
    }),
    fields: [{ key: "title", label: "Tiêu đề", kind: "text" }, ...styleFields],
    itemLabel: "Danh mục",
    itemFields: [{ key: "label", label: "Tên danh mục", kind: "text" }],
  },
  flashSale: {
    type: "flashSale",
    label: "Flash Sale",
    icon: "flame",
    category: "Thương mại",
    description: "Đếm ngược + sản phẩm giảm giá",
    defaults: () => ({ title: "Flash Sale", endsInMinutes: 135, source: "store", limit: 6 }),
    fields: [
      { key: "title", label: "Tiêu đề", kind: "text" },
      { key: "endsInMinutes", label: "Kết thúc sau (phút)", kind: "number", min: 1, max: 1440 },
      { key: "limit", label: "Số sản phẩm", kind: "slider", min: 2, max: 10 },
      ...styleFields,
    ],
  },
  productGrid: {
    type: "productGrid",
    label: "Lưới sản phẩm",
    icon: "package",
    category: "Thương mại",
    description: "Sản phẩm dạng lưới 2 cột",
    defaults: () => ({ title: "Gợi ý cho bạn", showViewAll: true, columns: 2, limit: 4, source: "store", variant: "editorial" }),
    fields: [
      ...titleFields,
      {
        key: "source",
        label: "Nguồn dữ liệu",
        kind: "select",
        options: [
          { value: "store", label: "Sản phẩm của Store" },
          { value: "manual", label: "Nhập tay" },
        ],
      },
      { key: "columns", label: "Số cột", kind: "slider", min: 2, max: 3 },
      { key: "limit", label: "Số sản phẩm", kind: "slider", min: 2, max: 12 },
      {
        key: "variant",
        label: "Kiểu thẻ",
        kind: "select",
        options: [
          { value: "editorial", label: "Editorial" },
          { value: "poster", label: "Poster" },
          { value: "minimal", label: "Tối giản" },
        ],
      },
      ...styleFields,
    ],
    itemLabel: "Sản phẩm",
    itemFields: [
      { key: "image", label: "Ảnh sản phẩm", kind: "image" },
      { key: "label", label: "Tên", kind: "text" },
      { key: "price", label: "Giá", kind: "number" },
      { key: "oldPrice", label: "Giá gốc", kind: "number" },
      { key: "badge", label: "Nhãn", kind: "text" },
      { key: "color", label: "Màu nền (khi không có ảnh)", kind: "color" },
    ],
  },
  productList: {
    type: "productList",
    label: "Danh sách dịch vụ",
    icon: "clipboard",
    category: "Thương mại",
    description: "Dịch vụ / sản phẩm dạng hàng ngang",
    defaults: () => ({ title: "Dịch vụ nổi bật", showViewAll: true, limit: 3, source: "store" }),
    fields: [
      ...titleFields,
      {
        key: "source",
        label: "Nguồn dữ liệu",
        kind: "select",
        options: [
          { value: "store", label: "Sản phẩm của Store" },
          { value: "manual", label: "Nhập tay" },
        ],
      },
      { key: "limit", label: "Số dòng", kind: "slider", min: 1, max: 10 },
      { key: "ctaLabel", label: "Chữ nút", kind: "text" },
      ...styleFields,
    ],
    itemLabel: "Dịch vụ",
    itemFields: [
      { key: "image", label: "Ảnh dịch vụ", kind: "image" },
      { key: "label", label: "Tên", kind: "text" },
      { key: "sub", label: "Mô tả", kind: "text" },
      { key: "price", label: "Giá", kind: "number" },
      { key: "color", label: "Màu nền", kind: "color" },
    ],
  },
  memberCard: {
    type: "memberCard",
    label: "Thẻ thành viên",
    icon: "crown",
    category: "Tiện ích",
    description: "Hạng, điểm tích luỹ, mã QR",
    defaults: () => ({ title: "Thành viên Vàng", subtitle: "1.250 điểm", variant: "vip", ctaLabel: "Đổi quà" }),
    fields: [
      {
        key: "variant",
        label: "Kiểu thẻ",
        kind: "select",
        options: [
          { value: "vip", label: "VIP gradient" },
          { value: "minimal", label: "Tối giản" },
          { value: "stamp", label: "Tem tích điểm" },
        ],
      },
      { key: "title", label: "Hạng thẻ / Tiêu đề", kind: "text" },
      { key: "subtitle", label: "Điểm / Mô tả", kind: "text" },
      { key: "ctaLabel", label: "Chữ nút", kind: "text" },
      ...memberCardStyleFields,
    ],
  },
  voucherList: {
    type: "voucherList",
    label: "Ví Voucher",
    icon: "ticket",
    category: "Thương mại",
    description: "Danh sách mã giảm giá, freeship từ Kho Voucher",
    defaults: () => ({
      title: "Ưu đãi & Voucher",
      source: "store",
      limit: 4,
      ctaLabel: "Lưu mã",
      items: [
        { id: uid("v"), label: "WELCOME50K", sub: "Giảm 50.000đ · Đơn từ 299K", badge: "-50K", color: "#f43f5e" },
        { id: uid("v"), label: "VIPGOLD15", sub: "Giảm 15% hạng Vàng · Đơn từ 500K", badge: "-15%", color: "#f59e0b" },
        { id: uid("v"), label: "FREESHIP", sub: "Miễn phí vận chuyển toàn quốc", badge: "FREE", color: "#10b981" },
      ],
    }),
    fields: [
      { key: "title", label: "Tiêu đề", kind: "text" },
      {
        key: "source",
        label: "Nguồn dữ liệu",
        kind: "select",
        options: [
          { value: "store", label: "Kho Voucher của Store" },
          { value: "manual", label: "Nhập tay" },
        ],
      },
      { key: "limit", label: "Số voucher hiển thị", kind: "slider", min: 1, max: 8 },
      { key: "ctaLabel", label: "Chữ trên nút", kind: "text" },
      ...styleFields,
    ],
    itemLabel: "Voucher",
    itemFields: [
      { key: "label", label: "Mã Voucher", kind: "text" },
      { key: "sub", label: "Mô tả điều kiện", kind: "text" },
      { key: "badge", label: "Nhãn giảm", kind: "text" },
      { key: "color", label: "Màu vé", kind: "color" },
    ],
  },
  booking: {
    type: "booking",
    label: "Đặt lịch nhanh",
    icon: "calendar",
    category: "Tiện ích",
    description: "Chọn khung giờ và đặt lịch",
    defaults: () => ({
      title: "Đặt lịch hôm nay",
      subtitle: "Chọn khung giờ phù hợp với bạn",
      ctaLabel: "Đặt lịch ngay",
      items: ["09:00", "10:30", "14:00", "16:30", "19:00"].map((label) => ({ id: uid("t"), label })),
    }),
    fields: [
      { key: "title", label: "Tiêu đề", kind: "text" },
      { key: "subtitle", label: "Mô tả", kind: "text" },
      { key: "ctaLabel", label: "Chữ nút", kind: "text" },
      ...styleFields,
    ],
    itemLabel: "Khung giờ",
    itemFields: [{ key: "label", label: "Giờ", kind: "text" }],
  },
  myBookings: {
    type: "myBookings",
    label: "Lịch hẹn của tôi",
    icon: "calendar",
    category: "Tiện ích",
    description: "Lịch hẹn sắp tới / lịch sử của khách đang đăng nhập",
    defaults: () => ({ title: "Lịch hẹn của tôi", subtitle: "Các lịch đã đặt tại cửa hàng", variant: "upcoming", limit: 3, ctaLabel: "Đặt lịch mới" }),
    fields: [
      { key: "title", label: "Tiêu đề", kind: "text" },
      { key: "subtitle", label: "Mô tả", kind: "text" },
      {
        key: "variant",
        label: "Hiển thị",
        kind: "select",
        options: [
          { value: "upcoming", label: "Lịch sắp tới" },
          { value: "history", label: "Lịch sử đã hẹn" },
        ],
      },
      { key: "limit", label: "Số lịch", kind: "slider", min: 1, max: 10 },
      { key: "ctaLabel", label: "Chữ nút (để trống = ẩn)", kind: "text" },
      ...styleFields,
    ],
  },
  myTreatments: {
    type: "myTreatments",
    label: "Liệu trình của tôi",
    icon: "sparkles",
    category: "Tiện ích",
    description: "Tiến độ liệu trình, buổi tiếp theo, kết quả buổi gần nhất",
    defaults: () => ({ title: "Liệu trình của tôi", subtitle: "Theo dõi tiến độ từng buổi", limit: 2 }),
    fields: [
      { key: "title", label: "Tiêu đề", kind: "text" },
      { key: "subtitle", label: "Mô tả", kind: "text" },
      { key: "limit", label: "Số liệu trình", kind: "slider", min: 1, max: 5 },
      ...styleFields,
    ],
  },
  news: {
    type: "news",
    label: "Tin tức / Bài viết",
    icon: "news",
    category: "Nội dung",
    description: "Danh sách bài viết, thông báo",
    defaults: () => ({
      title: "Tin tức & Sự kiện",
      showViewAll: true,
      items: [
        { id: uid("n"), label: "Khai trương chi nhánh mới tại Quận 7", sub: "2 giờ trước", color: "#0ea5e9" },
        { id: uid("n"), label: "Bí quyết chọn quà tặng ý nghĩa dịp cuối năm", sub: "Hôm qua", color: "#f59e0b" },
      ],
    }),
    fields: [...titleFields, ...styleFields],
    itemLabel: "Bài viết",
    itemFields: [
      { key: "image", label: "Ảnh bài viết", kind: "image" },
      { key: "label", label: "Tiêu đề", kind: "text" },
      { key: "sub", label: "Thời gian / Mô tả", kind: "text" },
      { key: "color", label: "Màu nền", kind: "color" },
    ],
  },
  form: {
    type: "form",
    label: "Biểu mẫu",
    icon: "file",
    category: "Tiện ích",
    description: "Form nhập liệu, nộp hồ sơ",
    defaults: () => ({
      title: "Gửi yêu cầu",
      subtitle: "Điền thông tin, chúng tôi sẽ phản hồi sớm",
      ctaLabel: "Gửi ngay",
      items: [
        { id: uid("f"), label: "Họ và tên", sub: "Nguyễn Văn A" },
        { id: uid("f"), label: "Số điện thoại", sub: "09xx xxx xxx" },
        { id: uid("f"), label: "Nội dung", sub: "Nhập nội dung..." },
      ],
    }),
    fields: [
      { key: "title", label: "Tiêu đề", kind: "text" },
      { key: "subtitle", label: "Mô tả", kind: "text" },
      { key: "ctaLabel", label: "Chữ nút gửi", kind: "text" },
      ...styleFields,
    ],
    itemLabel: "Trường",
    itemFields: [
      { key: "label", label: "Nhãn trường", kind: "text" },
      { key: "sub", label: "Placeholder", kind: "text" },
    ],
  },
  profile: {
    type: "profile",
    label: "Hồ sơ người dùng",
    icon: "user",
    category: "Bố cục",
    description: "Avatar, tên, hạng thành viên",
    defaults: () => ({ title: "Nguyễn Minh Anh", subtitle: "Thành viên Vàng · 1.250 điểm" }),
    fields: [
      { key: "title", label: "Tên hiển thị", kind: "text" },
      { key: "subtitle", label: "Mô tả", kind: "text" },
      ...styleFields,
    ],
  },
  memberAuth: {
    type: "memberAuth",
    label: "Đăng nhập hội viên",
    icon: "fingerprint",
    category: "Tiện ích",
    description: "Thẻ mời đăng nhập Zalo / đăng ký thành viên nhận điểm",
    defaults: () => ({
      title: "Trở thành hội viên ngay",
      subtitle: "Đăng nhập Zalo 1 chạm để tích điểm và nhận voucher",
      ctaLabel: "Đăng nhập / Đăng ký",
      variant: "card",
    }),
    fields: [
      { key: "title", label: "Tiêu đề", kind: "text" },
      { key: "subtitle", label: "Mô tả quyền lợi", kind: "text" },
      { key: "ctaLabel", label: "Chữ trên nút", kind: "text" },
      {
        key: "variant",
        label: "Kiểu hiển thị",
        kind: "select",
        options: [
          { value: "card", label: "Thẻ nổi bật" },
          { value: "banner", label: "Thanh gọn" },
        ],
      },
      ...styleFields,
    ],
  },
  menuList: {
    type: "menuList",
    label: "Danh sách menu",
    icon: "settings",
    category: "Nội dung",
    description: "Các dòng menu có icon & mũi tên",
    defaults: () => ({
      title: "Tiện ích",
      items: [
        { id: uid("m"), label: "Đơn hàng của tôi", icon: "receipt", color: "#0ea5e9" },
        { id: uid("m"), label: "Ví voucher", icon: "ticket", color: "#f43f5e" },
        { id: uid("m"), label: "Địa chỉ nhận hàng", icon: "map", color: "#10b981" },
        { id: uid("m"), label: "Trung tâm hỗ trợ", icon: "headphones", color: "#8b5cf6" },
      ],
    }),
    fields: [{ key: "title", label: "Tiêu đề nhóm", kind: "text" }, ...styleFields],
    itemLabel: "Dòng menu",
    itemFields: [
      { key: "label", label: "Tên", kind: "text" },
      { key: "sub", label: "Ghi chú phải", kind: "text" },
      { key: "icon", label: "Icon", kind: "icon" },
      { key: "color", label: "Màu", kind: "color" },
    ],
  },
  policyList: {
    type: "policyList",
    label: "Chính sách & Tài liệu",
    icon: "shield",
    category: "Nội dung",
    description: "Bảo hành, đổi trả, thanh toán, điều khoản từ Thư viện tài liệu",
    defaults: () => ({
      title: "Chính sách & Quy định",
      source: "store",
      variant: "accordion",
      limit: 6,
      items: [
        { id: uid("p"), label: "Chính sách bảo hành", sub: "Bảo hành chính hãng 12 tháng", icon: "shield", color: "#2563eb" },
        { id: uid("p"), label: "Quy định đổi trả hàng", sub: "Đổi trả miễn phí trong 07 ngày", icon: "receipt", color: "#f97316" },
        { id: uid("p"), label: "Thanh toán & Giao nhận", sub: "COD, VietQR, ZaloPay, Freeship", icon: "wallet", color: "#10b981" },
        { id: uid("p"), label: "Điều khoản & Lưu ý", sub: "Quy định đặt hàng & tích điểm", icon: "file", color: "#8b5cf6" },
      ],
    }),
    fields: [
      { key: "title", label: "Tiêu đề", kind: "text" },
      {
        key: "source",
        label: "Nguồn dữ liệu",
        kind: "select",
        options: [
          { value: "store", label: "Thư viện & Tài liệu" },
          { value: "manual", label: "Nhập tay" },
        ],
      },
      {
        key: "variant",
        label: "Kiểu hiển thị",
        kind: "select",
        options: [
          { value: "accordion", label: "Mở xem nhanh" },
          { value: "list", label: "Danh sách" },
          { value: "cards", label: "Thẻ 2 cột" },
        ],
      },
      { key: "limit", label: "Số tài liệu tối đa", kind: "slider", min: 1, max: 10 },
      ...styleFields,
    ],
    itemLabel: "Chính sách",
    itemFields: [
      { key: "label", label: "Tiêu đề", kind: "text" },
      { key: "sub", label: "Nội dung / Tóm tắt", kind: "text" },
      { key: "icon", label: "Icon", kind: "icon" },
      { key: "color", label: "Màu", kind: "color" },
    ],
  },
  contact: {
    type: "contact",
    label: "Liên hệ & Bản đồ",
    icon: "map",
    category: "Nội dung",
    description: "Hotline, địa chỉ, chat OA",
    defaults: () => ({ title: "Ghé thăm cửa hàng", subtitle: "123 Nguyễn Huệ, Quận 1, TP.HCM", ctaLabel: "0900 000 000" }),
    fields: [
      { key: "title", label: "Tiêu đề", kind: "text" },
      { key: "subtitle", label: "Địa chỉ", kind: "text" },
      { key: "ctaLabel", label: "Hotline", kind: "text" },
      ...styleFields,
    ],
  },
  spacer: {
    type: "spacer",
    label: "Khoảng trắng",
    icon: "grid",
    category: "Bố cục",
    description: "Khoảng cách giữa các khối",
    defaults: () => ({ height: 16 }),
    fields: [
      { key: "height", label: "Chiều cao", kind: "slider", min: 4, max: 80 },
      { key: "bgColor", label: "Màu nền", kind: "color", group: "style" },
    ],
  },
};

export const BLOCK_CATEGORIES: BlockMeta["category"][] = ["Bố cục", "Thương mại", "Tiện ích", "Nội dung"];
