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

export type FieldKind = "text" | "textarea" | "number" | "slider" | "select" | "switch" | "color" | "image";

export interface FieldDef {
  key: keyof BlockProps;
  label: string;
  kind: FieldKind;
  group?: "content" | "style";
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  step?: number;
}

export interface ItemFieldDef {
  key: keyof BlockItem;
  label: string;
  kind: "text" | "number" | "color" | "icon" | "image";
}
