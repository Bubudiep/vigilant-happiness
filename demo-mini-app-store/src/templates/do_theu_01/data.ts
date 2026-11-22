import { atom } from "jotai";

import { templatePath } from "../paths";

export const TEMPLATE_ID = "do_theu_01";
export const path = (sub = "") => templatePath(TEMPLATE_ID, sub);

/** Sản phẩm phôi để thêu */
export interface Blank {
  id: string;
  name: string;
  emoji: string;
  base: number;
  /** Màu nền phôi để vẽ preview */
  fabric: string;
  colors: { name: string; hex: string }[];
  note: string;
  popular?: boolean;
}

export const blanks: Blank[] = [
  { id: "ao_thun", name: "Áo thun thêu tên", emoji: "👕", base: 220000, fabric: "#f5f5f4", colors: [{ name: "Trắng", hex: "#f5f5f4" }, { name: "Đen", hex: "#262626" }, { name: "Be", hex: "#e7d8c3" }], note: "Cotton 100%, thêu ngực trái hoặc lưng", popular: true },
  { id: "khan_tay", name: "Khăn tay thêu chữ", emoji: "🧻", base: 90000, fabric: "#fdfaf3", colors: [{ name: "Trắng ngà", hex: "#fdfaf3" }, { name: "Hồng phấn", hex: "#f8d7dd" }], note: "Lanh mộc 30x30cm, thêu góc", popular: true },
  { id: "tote", name: "Túi tote thêu", emoji: "👜", base: 180000, fabric: "#eadfcd", colors: [{ name: "Mộc", hex: "#eadfcd" }, { name: "Đen", hex: "#2b2b2b" }], note: "Canvas dày, thêu mặt trước" },
  { id: "goi", name: "Vỏ gối thêu", emoji: "🛋️", base: 250000, fabric: "#e8eef4", colors: [{ name: "Xanh nhạt", hex: "#e8eef4" }, { name: "Kem", hex: "#f3ead8" }], note: "45x45cm, thêu giữa" },
  { id: "khung", name: "Khung tranh thêu tay", emoji: "🖼️", base: 450000, fabric: "#fbf7ef", colors: [{ name: "Vải mộc", hex: "#fbf7ef" }], note: "Khung tre 20cm, thêu tay 100%", popular: true },
  { id: "yem", name: "Yếm ăn cho bé", emoji: "👶", base: 120000, fabric: "#fff4e6", colors: [{ name: "Vàng nhạt", hex: "#fff4e6" }, { name: "Xanh mint", hex: "#dff3ea" }], note: "Cotton mềm, thêu tên bé" },
];

export const threadColors = [
  { name: "Đỏ son", hex: "#c0392b" },
  { name: "Xanh rêu", hex: "#4a6b3a" },
  { name: "Xanh navy", hex: "#1f3a5f" },
  { name: "Hồng đào", hex: "#e48a9a" },
  { name: "Vàng nghệ", hex: "#d4a017" },
  { name: "Nâu", hex: "#6d4c41" },
  { name: "Trắng", hex: "#ffffff" },
  { name: "Đen", hex: "#1a1a1a" },
];

export const fonts = [
  { id: "script", label: "Chữ viết tay", css: "'Brush Script MT', 'Segoe Script', cursive" },
  { id: "serif", label: "Có chân", css: "Georgia, 'Times New Roman', serif" },
  { id: "sans", label: "Không chân", css: "'Segoe UI', Roboto, sans-serif" },
];

export const motifs = [
  { id: "none", label: "Không", emoji: "", price: 0 },
  { id: "hoa", label: "Hoa nhí", emoji: "🌸", price: 30000 },
  { id: "tim", label: "Trái tim", emoji: "💗", price: 20000 },
  { id: "la", label: "Cành lá", emoji: "🌿", price: 30000 },
  { id: "meo", label: "Mèo con", emoji: "🐱", price: 50000 },
];

export const PRICE_PER_CHAR = 5000;

export const gallery = [
  { emoji: "👕", title: "Áo cặp thêu tên", color: "#c0392b" },
  { emoji: "🖼️", title: "Khung thêu chân dung thú cưng", color: "#4a6b3a" },
  { emoji: "🧻", title: "Khăn tay cưới thêu chữ cái", color: "#e48a9a" },
  { emoji: "👶", title: "Yếm thêu tên bé", color: "#d4a017" },
];

export const orderSteps = ["Xác nhận mẫu", "Đang thêu", "Hoàn thiện", "Đang giao"];

export interface EmbroideryOrder {
  id: string;
  blank: string;
  emoji: string;
  text: string;
  detail: string;
  total: number;
  /** Chỉ số bước hiện tại trong orderSteps */
  step: number;
  date: string;
}

export const ordersAtom = atom<EmbroideryOrder[]>([
  { id: "DT1024", blank: "Khung tranh thêu tay", emoji: "🖼️", text: "Mimi & Mochi", detail: "Chỉ hồng đào · Chữ viết tay · Hoa nhí", total: 515000, step: 1, date: "12/11" },
]);
