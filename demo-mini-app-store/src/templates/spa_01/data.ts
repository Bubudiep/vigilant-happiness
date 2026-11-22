import { createBookingStore } from "../_shared/kit";
import { templatePath } from "../paths";

export const TEMPLATE_ID = "spa_01";
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
  { id: "massage", label: "Massage" },
  { id: "da", label: "Chăm sóc da" },
  { id: "toc", label: "Gội & tóc" },
  { id: "nail", label: "Nail" },
];

export const services: Service[] = [
  { id: "s01", name: "Massage body đá nóng", category: "massage", minutes: 90, price: 550000, salePrice: 450000, emoji: "💆", color: "#b5476f", description: "Đá bazan nóng giúp giãn cơ, lưu thông khí huyết.", hot: true },
  { id: "s02", name: "Massage chân thảo dược", category: "massage", minutes: 60, price: 300000, emoji: "🦶", color: "#8d6e63", description: "Ngâm chân thảo dược, bấm huyệt bàn chân." },
  { id: "s03", name: "Chăm sóc da cơ bản", category: "da", minutes: 60, price: 400000, emoji: "🧖", color: "#e7a3b8", description: "Làm sạch sâu, tẩy da chết, đắp mặt nạ.", hot: true },
  { id: "s04", name: "Trị mụn chuyên sâu", category: "da", minutes: 75, price: 600000, emoji: "✨", color: "#7cb342", description: "Lấy nhân mụn chuẩn y khoa, điện di dưỡng chất." },
  { id: "s05", name: "Gội đầu dưỡng sinh", category: "toc", minutes: 45, price: 150000, salePrice: 120000, emoji: "🫧", color: "#4fc3f7", description: "Gội thảo dược, massage cổ vai gáy.", hot: true },
  { id: "s06", name: "Hấp phục hồi tóc", category: "toc", minutes: 60, price: 350000, emoji: "💇", color: "#ab47bc", description: "Ủ keratin phục hồi tóc hư tổn." },
  { id: "s07", name: "Sơn gel + vẽ", category: "nail", minutes: 60, price: 250000, emoji: "💅", color: "#ec407a", description: "Sơn gel Hàn Quốc, bền màu 3 tuần." },
];

export const staff = [
  { id: "any", name: "Bất kỳ", emoji: "✨", title: "Spa xếp lịch" },
  { id: "lan", name: "Chị Lan", emoji: "👩", title: "8 năm KN" },
  { id: "mai", name: "Chị Mai", emoji: "👩‍🦰", title: "Chuyên da" },
  { id: "hoa", name: "Chị Hoa", emoji: "👱‍♀️", title: "Massage" },
];

export const banners = [
  { title: "Giảm 20% liệu trình da", subtitle: "Khách mới tháng này", from: "#b5476f", to: "#e7a3b8", emoji: "🧖", eyebrow: "Ưu đãi" },
  { title: "Combo thư giãn", subtitle: "Massage + gội chỉ 499K", from: "#6d4c41", to: "#bcaaa4", emoji: "🪷", eyebrow: "Combo" },
];

export const findService = (id?: string) => services.find((s) => s.id === id);

export const bookingsAtom = createBookingStore([
  { id: "b0", title: "Gội đầu dưỡng sinh", subtitle: "Chị Mai", date: "02/11", time: "18:00", emoji: "🫧", status: "done" },
]);
