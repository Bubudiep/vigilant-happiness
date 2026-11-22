import { atom } from "jotai";

import { createCartStore } from "../_shared/kit";
import { templatePath } from "../paths";

export const TEMPLATE_ID = "mixue_01";
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
  /** Đồ uống có tuỳ chọn size / đá / đường */
  customizable?: boolean;
}

export const menuCategories = [
  { id: "kem", label: "Kem", emoji: "🍦" },
  { id: "tra_sua", label: "Trà sữa", emoji: "🧋" },
  { id: "tra_trai_cay", label: "Trà trái cây", emoji: "🍋" },
  { id: "dac_biet", label: "Đặc biệt", emoji: "⭐" },
];

export const drinks: Drink[] = [
  { id: "k01", name: "Kem ốc quế", category: "kem", price: 10000, emoji: "🍦", color: "#e60012", description: "Kem tươi vani mềm mịn trên ốc quế giòn.", bestSeller: true },
  { id: "k02", name: "Sundae dâu", category: "kem", price: 25000, emoji: "🍓", color: "#e8436b", description: "Kem tươi phủ sốt dâu tây chua ngọt." },
  { id: "k03", name: "Sundae socola", category: "kem", price: 25000, emoji: "🍫", color: "#6d4c41", description: "Kem tươi phủ sốt socola đậm vị.", bestSeller: true },
  { id: "k04", name: "Kem dâu tây lắc", category: "kem", price: 22000, emoji: "🥤", color: "#f06292", description: "Kem tươi xay cùng dâu tây, mát lạnh." },
  { id: "s01", name: "Trà sữa trân châu đường đen", category: "tra_sua", price: 25000, emoji: "🧋", color: "#8d5524", description: "Trà sữa béo, trân châu dẻo, sốt đường đen.", bestSeller: true, customizable: true },
  { id: "s02", name: "Trà sữa Ô Long", category: "tra_sua", price: 22000, emoji: "🧋", color: "#a1887f", description: "Trà Ô Long rang thơm, sữa béo nhẹ.", customizable: true },
  { id: "s03", name: "Trà sữa kem phô mai", category: "tra_sua", price: 28000, emoji: "🧀", color: "#d9a441", description: "Lớp kem phô mai mặn béo trên trà sữa.", customizable: true },
  { id: "t01", name: "Trà chanh tươi", category: "tra_trai_cay", price: 15000, emoji: "🍋", color: "#c0ca33", description: "Chanh tươi lắc, trà xanh nhài, chua ngọt.", bestSeller: true, customizable: true },
  { id: "t02", name: "Trà đào", category: "tra_trai_cay", price: 22000, emoji: "🍑", color: "#f29e6d", description: "Trà đen, đào miếng giòn ngọt.", customizable: true },
  { id: "t03", name: "Trà xanh nhài", category: "tra_trai_cay", price: 12000, emoji: "🍵", color: "#7cb342", description: "Trà xanh hương nhài thanh mát.", customizable: true },
  { id: "d01", name: "Dương chi cam lộ", category: "dac_biet", price: 30000, emoji: "🥭", color: "#ffb300", description: "Xoài, bưởi, sữa dừa và trân châu sago.", bestSeller: true },
  { id: "d02", name: "Nước chanh mật ong", category: "dac_biet", price: 20000, emoji: "🍯", color: "#f9a825", description: "Chanh tươi, mật ong, đá viên mát lạnh.", customizable: true },
];

export const sizes = [
  { id: "M", label: "Vừa", extra: 0 },
  { id: "L", label: "Lớn", extra: 5000 },
];
export const sugarLevels = ["100%", "70%", "50%", "0%"];
export const iceLevels = ["Bình thường", "Ít đá", "Không đá"];
export const toppings = [
  { id: "tc", label: "Trân châu", price: 5000 },
  { id: "thach", label: "Thạch dừa", price: 5000 },
  { id: "kem", label: "Kem tươi", price: 7000 },
];

export const banners = [
  { title: "Kem ốc quế chỉ 10K", subtitle: "Mát lạnh mỗi ngày, mua 5 tặng 1", from: "#e60012", to: "#ff5a5f", emoji: "🍦", eyebrow: "Ưu đãi" },
  { title: "Trà chanh 15K", subtitle: "Chanh tươi lắc tay, giải nhiệt mùa hè", from: "#c4000f", to: "#f6a623", emoji: "🍋", eyebrow: "Bán chạy" },
];

export const findDrink = (id?: string) => drinks.find((d) => d.id === id);

export type OrderMode = "delivery" | "pickup" | "dine_in";
export const orderModes: { id: OrderMode; label: string }[] = [
  { id: "delivery", label: "Giao tận nơi" },
  { id: "pickup", label: "Tự đến lấy" },
  { id: "dine_in", label: "Tại cửa hàng" },
];
export const orderModeAtom = atom<OrderMode>("delivery");

export const cart = createCartStore();
