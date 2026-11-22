import { createBookingStore, createCartStore } from "../_shared/kit";
import { templatePath } from "../paths";

export const TEMPLATE_ID = "fnb_nha_hang_01";
export const path = (sub = "") => templatePath(TEMPLATE_ID, sub);

export interface Dish {
  id: string;
  name: string;
  category: string;
  price: number;
  emoji: string;
  color: string;
  description: string;
  signature?: boolean;
}

export const dishCategories = [
  { id: "all", label: "Tất cả" },
  { id: "khai_vi", label: "Khai vị" },
  { id: "mon_chinh", label: "Món chính" },
  { id: "lau", label: "Lẩu" },
  { id: "do_uong", label: "Đồ uống" },
];

export const dishes: Dish[] = [
  { id: "m01", name: "Gỏi cuốn tôm thịt", category: "khai_vi", price: 65000, emoji: "🥗", color: "#7cb342", description: "4 cuốn, chấm tương đậu." },
  { id: "m02", name: "Chả giò rế", category: "khai_vi", price: 75000, emoji: "🥟", color: "#e0a030", description: "Giòn rụm, nhân tôm cua." },
  { id: "m03", name: "Cá kho tộ", category: "mon_chinh", price: 145000, emoji: "🐟", color: "#8d5524", description: "Cá basa kho tộ đất, nước màu dừa.", signature: true },
  { id: "m04", name: "Gà ta luộc lá chanh", category: "mon_chinh", price: 285000, emoji: "🍗", color: "#f0b429", description: "Nửa con gà ta, muối tiêu chanh.", signature: true },
  { id: "m05", name: "Canh chua cá lóc", category: "mon_chinh", price: 125000, emoji: "🍲", color: "#e64a19", description: "Me chua, bạc hà, đậu bắp." },
  { id: "m06", name: "Rau muống xào tỏi", category: "mon_chinh", price: 55000, emoji: "🥬", color: "#43a047", description: "Rau sạch trong ngày." },
  { id: "m07", name: "Lẩu mắm miền Tây", category: "lau", price: 395000, emoji: "🫕", color: "#6d4c41", description: "Cho 3–4 người, kèm 10 loại rau.", signature: true },
  { id: "m08", name: "Lẩu thái hải sản", category: "lau", price: 365000, emoji: "🦐", color: "#ef6c00", description: "Tôm, mực, nghêu, chua cay." },
  { id: "m09", name: "Nước sâm mía lau", category: "do_uong", price: 25000, emoji: "🥤", color: "#a1887f", description: "Nấu tại quán." },
  { id: "m10", name: "Trà đá", category: "do_uong", price: 5000, emoji: "🧊", color: "#90a4ae", description: "Miễn phí thêm." },
];

export const banners = [
  { title: "Lẩu mắm giảm 15%", subtitle: "Thứ 2 – Thứ 5, sau 17h", from: "#b23a1d", to: "#e8a33d", emoji: "🫕", eyebrow: "Ưu đãi" },
  { title: "Phòng riêng 20 khách", subtitle: "Tiệc gia đình, công ty", from: "#4e342e", to: "#a1887f", emoji: "🎉", eyebrow: "Đặt tiệc" },
];

export const areas = [
  { id: "indoor", label: "Trong nhà" },
  { id: "garden", label: "Sân vườn" },
  { id: "vip", label: "Phòng VIP" },
];

export const order = createCartStore();
export const reservationsAtom = createBookingStore();
