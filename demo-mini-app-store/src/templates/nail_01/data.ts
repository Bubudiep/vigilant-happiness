import { createBookingStore } from "../_shared/kit";
import { templatePath } from "../paths";

export const TEMPLATE_ID = "nail_01";
export const path = (sub = "") => templatePath(TEMPLATE_ID, sub);

export interface Service {
  id: string;
  name: string;
  category: string;
  minutes: number;
  price: number;
  salePrice?: number;
  emoji: string;
  color: string;
  description: string;
  hot?: boolean;
}

export const serviceCategories = [
  { id: "all", label: "Tất cả" },
  { id: "son", label: "Sơn gel" },
  { id: "ve", label: "Vẽ & đính đá" },
  { id: "dap", label: "Đắp móng" },
  { id: "cham_soc", label: "Chăm sóc" },
];

export const services: Service[] = [
  { id: "n02", name: "Sơn gel trơn Hàn Quốc", category: "son", minutes: 45, price: 150000, salePrice: 120000, emoji: "💅", color: "#db2777", description: "Hơn 300 màu, bền màu 3–4 tuần, không bong.", hot: true },
  { id: "n04", name: "Sơn gel chân + cắt da", category: "son", minutes: 50, price: 160000, emoji: "🦶", color: "#be185d", description: "Ngâm chân thảo dược, cắt da, sơn gel." },
  { id: "n01", name: "Vẽ nail art theo mẫu", category: "ve", minutes: 60, price: 250000, emoji: "🎨", color: "#a21caf", description: "Vẽ tay, ombre, mắt mèo, tráng gương.", hot: true },
  { id: "n05", name: "Đính đá & charm", category: "ve", minutes: 30, price: 80000, emoji: "💎", color: "#7c3aed", description: "Đá Swarovski, charm nơ, ngọc trai (tính theo móng)." },
  { id: "n03", name: "Đắp gel / úp móng giả", category: "dap", minutes: 90, price: 350000, emoji: "✨", color: "#e11d48", description: "Nối dài móng tự nhiên, form vuông, oval, nhọn.", hot: true },
  { id: "n06", name: "Tháo gel + dưỡng móng", category: "cham_soc", minutes: 30, price: 60000, emoji: "🧴", color: "#0d9488", description: "Tháo gel không hại móng, phủ dưỡng keratin." },
  { id: "n07", name: "Chăm sóc da tay paraffin", category: "cham_soc", minutes: 40, price: 180000, emoji: "🤲", color: "#f59e0b", description: "Tẩy tế bào chết, ủ sáp paraffin, massage tay." },
];

/** Mẫu nail (demo): dải màu gradient thay cho ảnh */
export const designs = [
  { id: "d1", name: "Ombre hồng sữa", colors: ["#fbcfe8", "#f9a8d4", "#fff1f2"] },
  { id: "d2", name: "Mắt mèo ánh bạc", colors: ["#1f2937", "#9ca3af", "#e5e7eb"] },
  { id: "d3", name: "Đỏ rượu tráng gương", colors: ["#7f1d1d", "#b91c1c", "#fecaca"] },
  { id: "d4", name: "French tip cổ điển", colors: ["#fdf2f8", "#ffffff", "#fce7f3"] },
  { id: "d5", name: "Thạch nude", colors: ["#e7c6b2", "#f5e1d3", "#fdf6f0"] },
  { id: "d6", name: "Xanh mint loang", colors: ["#a7f3d0", "#5eead4", "#ecfeff"] },
];

export const polishColors = ["#be123c", "#e11d48", "#f472b6", "#fbcfe8", "#e7c6b2", "#a16207", "#7c3aed", "#0ea5e9", "#10b981", "#111827", "#f5f5f4"];

export const artists = [
  { id: "any", name: "Thợ trống sớm nhất", emoji: "✨", title: "Tiệm xếp thợ" },
  { id: "may", name: "Chị Mây", emoji: "👩‍🎨", title: "Vẽ tay · 7 năm" },
  { id: "linh", name: "Linh", emoji: "👩", title: "Đắp gel" },
  { id: "thu", name: "Thu", emoji: "👱‍♀️", title: "Sơn gel nhanh" },
];

export const banners = [
  { title: "Sơn gel chỉ 120K", subtitle: "Tặng dưỡng móng cho khách mới", from: "#db2777", to: "#f9a8d4", emoji: "💅", eyebrow: "Ưu đãi" },
  { title: "Mẫu nail Tết đã có", subtitle: "Vẽ tay, đính đá theo yêu cầu", from: "#a21caf", to: "#f0abfc", emoji: "🌸", eyebrow: "Mẫu mới" },
];

export const findService = (id?: string) => services.find((s) => s.id === id);

export const bookingsAtom = createBookingStore([
  { id: "b0", title: "Sơn gel trơn Hàn Quốc", subtitle: "Chị Mây · Ombre hồng sữa", date: "28/10", time: "15:00", emoji: "💅", status: "done" },
]);
