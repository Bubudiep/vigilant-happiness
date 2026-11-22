import { atom } from "jotai";

import { createCartStore } from "../_shared/kit";
import { templatePath } from "../paths";

export const TEMPLATE_ID = "fnb_cafe_01";
export const path = (sub = "") => templatePath(TEMPLATE_ID, sub);

export interface Drink {
  id: string;
  name: string;
  category: string;
  price: number;
  emoji: string;
  color: string;
  description: string;
  bestSeller?: boolean;
  /** Đồ uống có tuỳ chọn đá / đường */
  customizable?: boolean;
}

export const menuCategories = [
  { id: "ca_phe", label: "Cà phê", emoji: "☕" },
  { id: "tra", label: "Trà trái cây", emoji: "🍑" },
  { id: "da_xay", label: "Đá xay", emoji: "🧋" },
  { id: "banh", label: "Bánh ngọt", emoji: "🥐" },
];

export const drinks: Drink[] = [
  { id: "d01", name: "Cà phê sữa đá", category: "ca_phe", price: 35000, emoji: "☕", color: "#8b5e3c", description: "Robusta rang mộc, pha phin, sữa đặc.", bestSeller: true, customizable: true },
  { id: "d02", name: "Bạc xỉu", category: "ca_phe", price: 39000, emoji: "🥛", color: "#c9a27e", description: "Nhiều sữa, ít cà phê, béo nhẹ.", bestSeller: true, customizable: true },
  { id: "d03", name: "Cold brew cam sả", category: "ca_phe", price: 49000, emoji: "🍊", color: "#e08a2c", description: "Ủ lạnh 16 giờ, thêm cam tươi và sả.", customizable: true },
  { id: "d04", name: "Americano", category: "ca_phe", price: 39000, emoji: "☕", color: "#5a3a22", description: "Espresso pha loãng, đậm vị.", customizable: true },
  { id: "d05", name: "Trà đào cam sả", category: "tra", price: 45000, emoji: "🍑", color: "#f29e6d", description: "Trà đen, đào miếng, cam, sả.", bestSeller: true, customizable: true },
  { id: "d06", name: "Trà vải hoa hồng", category: "tra", price: 45000, emoji: "🌹", color: "#e5738f", description: "Trà xanh nhài, vải thiều, hương hồng.", customizable: true },
  { id: "d07", name: "Trà chanh dây", category: "tra", price: 42000, emoji: "🍋", color: "#e4c13b", description: "Chanh dây tươi, hạt é.", customizable: true },
  { id: "d08", name: "Matcha đá xay", category: "da_xay", price: 55000, emoji: "🍵", color: "#6aa84f", description: "Matcha Nhật, kem tươi.", bestSeller: true, customizable: true },
  { id: "d09", name: "Cookie đá xay", category: "da_xay", price: 55000, emoji: "🍪", color: "#8d6e63", description: "Bánh cookie nghiền, sốt socola.", customizable: true },
  { id: "d10", name: "Croissant bơ", category: "banh", price: 32000, emoji: "🥐", color: "#d9a441", description: "Nướng mới mỗi sáng." },
  { id: "d11", name: "Tiramisu", category: "banh", price: 45000, emoji: "🍰", color: "#a1887f", description: "Mascarpone, cà phê espresso." },
];

export const sizes = [
  { id: "S", label: "Nhỏ", extra: 0 },
  { id: "M", label: "Vừa", extra: 6000 },
  { id: "L", label: "Lớn", extra: 10000 },
];
export const sugarLevels = ["100%", "70%", "50%", "0%"];
export const iceLevels = ["Bình thường", "Ít đá", "Không đá"];
export const toppings = [
  { id: "tc", label: "Trân châu", price: 8000 },
  { id: "kem", label: "Kem cheese", price: 10000 },
  { id: "thach", label: "Thạch cà phê", price: 6000 },
];

export const banners = [
  { title: "Mua 2 tặng 1", subtitle: "Tất cả trà trái cây, thứ 3 hằng tuần", from: "#6b4226", to: "#c98b4f", emoji: "🍑", eyebrow: "Ưu đãi" },
  { title: "Cold brew mới", subtitle: "Cam sả mát lạnh mùa hè", from: "#e08a2c", to: "#f5c26b", emoji: "🍊", eyebrow: "Món mới" },
];

export const findDrink = (id?: string) => drinks.find((d) => d.id === id);

export type OrderMode = "delivery" | "pickup" | "dine_in";
export const orderModes: { id: OrderMode; label: string }[] = [
  { id: "delivery", label: "Giao tận nơi" },
  { id: "pickup", label: "Tự đến lấy" },
  { id: "dine_in", label: "Tại quán" },
];
export const orderModeAtom = atom<OrderMode>("delivery");

export const cart = createCartStore();
