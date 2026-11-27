// ⚠️ Tự sinh từ frontend/src/miniapp-builder — đừng sửa ở đây, sửa bên frontend rồi chạy `node scripts/sync-builder.mjs`.
/**
 * reMini Builder — schema mô tả toàn bộ giao diện một Zalo Mini App.
 * Schema này được lưu kèm StoreConfig (field `builder`) và có thể xuất JSON
 * để Mini App runtime đọc và render.
 */

export type BlockType =
  | "header"
  | "search"
  | "notice"
  | "banner"
  | "quickActions"
  | "categories"
  | "flashSale"
  | "productGrid"
  | "productList"
  | "memberCard"
  | "voucherList"
  | "booking"
  | "myBookings"
  | "myTreatments"
  | "news"
  | "form"
  | "profile"
  | "memberAuth"
  | "menuList"
  | "policyList"
  | "contact"
  | "spacer";

export interface BlockItem {
  id: string;
  label: string;
  sub?: string;
  icon?: string;
  image?: string;
  color?: string;
  colorTo?: string;
  price?: number;
  oldPrice?: number;
  badge?: string;
}

export interface BlockProps {
  title?: string;
  subtitle?: string;
  eyebrow?: string;
  logoUrl?: string;
  verified?: boolean;
  ctaLabel?: string;
  placeholder?: string;
  variant?: string;
  columns?: number;
  limit?: number;
  height?: number;
  radius?: number;
  paddingY?: number;
  bgColor?: string;
  showViewAll?: boolean;
  source?: "store" | "manual";
  endsInMinutes?: number;
  autoplay?: boolean;
  /** Thẻ tích tem: số ô tem & biểu tượng (khi cửa hàng đã bật thẻ tích tem, Mini App dùng cấu hình thật) */
  stampCount?: number;
  stampIcon?: string;
  /** Biểu tượng tự tải lên (ảnh PNG nền trong) — thay cho biểu tượng có sẵn */
  stampIconImage?: string;
  /** Ô cuối (phần quà): biểu tượng tự tải lên, bỏ trống = hộp quà */
  stampRewardImage?: string;
  stampShape?: "circle" | "rounded" | "square";
  stampSize?: number;
  stampIconSize?: number;
  stampGap?: number;
  stampItemBg?: string;
  stampIconColor?: string;
  stampEmptyBg?: string;
  stampEmptyIconColor?: string;
  /** Thẻ thành viên: gradient (kiểu VIP), màu nền (tối giản / tem) và màu chung của thẻ — bỏ trống = theo giao diện */
  gradientFrom?: string;
  gradientTo?: string;
  gradientAngle?: number;
  cardDecor?: boolean;
  cardBg?: string;
  cardTextColor?: string;
  cardBarColor?: string;
  cardButtonColor?: string;
  cardBorderColor?: string;
  cardRadius?: number;
  items?: BlockItem[];
}

export interface Block {
  id: string;
  type: BlockType;
  name?: string;
  hidden?: boolean;
  props: BlockProps;
}

export type AppBarStyle = "white" | "primary" | "transparent";

export interface BuilderPage {
  id: string;
  name: string;
  route: string;
  icon: string;
  inTabbar: boolean;
  bgColor?: string;
  appBarStyle?: "inherit" | AppBarStyle;
  appBarBg?: string;
  blocks: Block[];
}

export interface BuilderTheme {
  primary: string;
  accent: string;
  bg: string;
  radius: number;
  font: "Inter" | "Be Vietnam Pro" | "system";
  tabbarStyle: "classic" | "floating" | "minimal" | "indicator";
  tabbarBg?: string;
  tabbarActiveColor?: string;
  tabbarInactiveColor?: string;
  tabbarRadius?: number;
  tabbarShowLabel?: boolean;
  tabbarBorder?: boolean;
  appBarStyle?: AppBarStyle;
  appBarBg?: string;
  appBarText?: "auto" | "light" | "dark";
}

export interface BuilderAuthConfig {
  enabled: boolean;
  allowZaloQuickLogin: boolean;
  allowPhoneOtp: boolean;
  requirePhoneVerify: boolean;
  requireFollowOa: boolean;
  welcomePoints: number;
  loginTitle: string;
  loginSubtitle: string;
  protectedActions: {
    checkout: boolean;
    booking: boolean;
    voucher: boolean;
    memberCard: boolean;
    form: boolean;
  };
}

export const DEFAULT_BUILDER_AUTH: BuilderAuthConfig = {
  enabled: true,
  allowZaloQuickLogin: true,
  allowPhoneOtp: true,
  requirePhoneVerify: true,
  requireFollowOa: true,
  welcomePoints: 50,
  loginTitle: "Đăng nhập thành viên",
  loginSubtitle: "Tích điểm mỗi đơn hàng, nhận ưu đãi độc quyền và lưu lịch sử trên Zalo Mini App.",
  protectedActions: {
    checkout: true,
    booking: true,
    voucher: true,
    memberCard: true,
    form: false,
  },
};

export interface BuilderSchema {
  version: 1;
  presetId: string;
  appName: string;
  theme: BuilderTheme;
  auth?: BuilderAuthConfig;
  pages: BuilderPage[];
  updatedAt: string;
}

export interface Selection {
  blockId: string;
  itemId?: string;
}

export type FieldKind = "text" | "textarea" | "number" | "slider" | "select" | "switch" | "color" | "image" | "stampIcon" | "iconImage";

export interface FieldDef {
  key: keyof BlockProps;
  label: string;
  kind: FieldKind;
  group?: "content" | "style";
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  /** Giá trị đang áp dụng khi chưa chỉnh (để hiển thị trên điều khiển) */
  fallback?: string | number | boolean | ((theme: BuilderTheme) => string);
  /** Chỉ hiện thuộc tính khi thoả điều kiện (VD theo kiểu thẻ) */
  showIf?: (props: BlockProps) => boolean;
}

export interface ItemFieldDef {
  key: keyof BlockItem;
  label: string;
  kind: "text" | "number" | "color" | "icon" | "image";
}
