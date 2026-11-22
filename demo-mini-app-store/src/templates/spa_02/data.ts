import { atom } from "jotai";

import { createBookingStore } from "../_shared/kit";
import { templatePath } from "../paths";

export const TEMPLATE_ID = "spa_02";
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
  { id: "goi", label: "Gội dưỡng sinh" },
  { id: "da", label: "Chăm sóc da" },
  { id: "tay_chan", label: "Tay & chân" },
];

export const services: Service[] = [
  { id: "p01", name: "Massage đá nóng toàn thân", category: "massage", minutes: 90, price: 590000, salePrice: 490000, emoji: "🪨", color: "#0f766e", description: "Đá bazan nóng + tinh dầu sả chanh, giãn cơ sâu.", hot: true },
  { id: "p02", name: "Bấm huyệt chân thảo dược", category: "massage", minutes: 60, price: 320000, emoji: "🦶", color: "#92400e", description: "Ngâm chân gừng sả, bấm huyệt phản xạ." },
  { id: "p04", name: "Gội đầu dưỡng sinh 12 bước", category: "goi", minutes: 60, price: 180000, salePrice: 149000, emoji: "🫧", color: "#0e7490", description: "Gội bồ kết, massage cổ vai gáy, xông hơi mặt.", hot: true },
  { id: "p03", name: "Massage mặt nâng cơ", category: "da", minutes: 60, price: 450000, emoji: "🌿", color: "#15803d", description: "Massage nâng cơ, đắp mặt nạ collagen." },
  { id: "p06", name: "Lấy nhân mụn chuẩn y khoa", category: "da", minutes: 75, price: 380000, emoji: "✨", color: "#b45309", description: "Làm sạch sâu, lấy nhân mụn, điện di dịu da.", hot: true },
  { id: "p05", name: "Chăm sóc da tay & ủ paraffin", category: "tay_chan", minutes: 45, price: 220000, emoji: "🤲", color: "#be185d", description: "Tẩy tế bào chết, ủ sáp paraffin, dưỡng ẩm." },
  { id: "p07", name: "Hấp phục hồi tóc thảo mộc", category: "goi", minutes: 50, price: 260000, emoji: "💆", color: "#6d28d9", description: "Ủ tóc thảo mộc, hấp nóng, phục hồi tóc khô xơ." },
];

export interface Package {
  id: string;
  name: string;
  sessions: number;
  price: number;
  perSession: number;
  serviceId: string;
  note: string;
  best?: boolean;
}

export const packages: Package[] = [
  { id: "k1", name: "Gói Gội dưỡng sinh 10 buổi", sessions: 10, price: 1290000, perSession: 180000, serviceId: "p04", note: "Dùng trong 6 tháng · tặng 1 buổi", best: true },
  { id: "k2", name: "Gói Massage đá nóng 5 buổi", sessions: 5, price: 2190000, perSession: 590000, serviceId: "p01", note: "Dùng trong 3 tháng · đi cùng người thân" },
  { id: "k3", name: "Liệu trình trị mụn 8 buổi", sessions: 8, price: 2490000, perSession: 380000, serviceId: "p06", note: "Kèm soi da trước & sau liệu trình" },
];

/** Gói khách đang dùng (demo) */
export const myPackagesAtom = atom([{ packageId: "k1", used: 6, expires: "30/04/2027" }]);

export const rooms = [
  { id: "any", name: "Phòng bất kỳ", emoji: "🌿", title: "Spa xếp phòng" },
  { id: "single", name: "Phòng đơn", emoji: "🛏️", title: "Riêng tư" },
  { id: "couple", name: "Phòng đôi", emoji: "💑", title: "Đi cùng người thân" },
  { id: "vip", name: "Phòng VIP", emoji: "👑", title: "Bồn ngâm thảo dược" },
];

export const therapists = [
  { id: "any", name: "Bất kỳ", emoji: "✨", title: "Spa xếp KTV" },
  { id: "hien", name: "Chị Hiền", emoji: "👩", title: "Massage · 9 năm" },
  { id: "an", name: "An", emoji: "👩‍🦰", title: "Chăm sóc da" },
  { id: "nhung", name: "Nhung", emoji: "👱‍♀️", title: "Gội dưỡng sinh" },
];

export const banners = [
  { title: "Gói gội 10 buổi chỉ 1.29tr", subtitle: "Tặng thêm 1 buổi tháng này", from: "#0f766e", to: "#5eead4", emoji: "🫧", eyebrow: "Liệu trình" },
  { title: "Massage đá nóng 490K", subtitle: "Thư giãn sâu sau giờ làm", from: "#78350f", to: "#d4a373", emoji: "🪨", eyebrow: "Ưu đãi" },
];

export const findService = (id?: string) => services.find((s) => s.id === id);
export const findPackage = (id?: string) => packages.find((p) => p.id === id);

export const bookingsAtom = createBookingStore([
  { id: "b0", title: "Gội đầu dưỡng sinh 12 bước", subtitle: "Chị Nhung · trừ gói 10 buổi", date: "01/11", time: "19:00", emoji: "🫧", status: "done" },
]);
