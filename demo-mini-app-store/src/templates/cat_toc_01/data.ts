import { atom } from "jotai";

import { createBookingStore } from "../_shared/kit";
import { templatePath } from "../paths";

export const TEMPLATE_ID = "cat_toc_01";
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
  { id: "cat", label: "Cắt tóc" },
  { id: "rau", label: "Cạo & tỉa râu" },
  { id: "hoa_chat", label: "Uốn / Nhuộm" },
  { id: "combo", label: "Combo" },
];

export const services: Service[] = [
  { id: "c01", name: "Cắt tóc nam tạo kiểu", category: "cat", minutes: 30, price: 80000, emoji: "💈", color: "#1f2937", description: "Tư vấn kiểu theo khuôn mặt, cắt + vuốt sáp.", hot: true },
  { id: "c04", name: "Cắt kéo Undercut / Side part", category: "cat", minutes: 40, price: 100000, emoji: "✂️", color: "#374151", description: "Cắt kéo hoàn toàn, fade chân tóc sắc nét." },
  { id: "c02", name: "Combo cắt + gội + ráy tai", category: "combo", minutes: 50, price: 150000, salePrice: 120000, emoji: "🧖‍♂️", color: "#c08a3e", description: "Cắt, gội massage đầu, ráy tai, đắp khăn nóng.", hot: true },
  { id: "c03", name: "Cạo mặt khăn nóng", category: "rau", minutes: 25, price: 60000, emoji: "🪒", color: "#7c2d12", description: "Dao cạo thẳng, khăn nóng, dưỡng sau cạo." },
  { id: "c08", name: "Tỉa & tạo kiểu râu", category: "rau", minutes: 20, price: 50000, emoji: "🧔", color: "#78350f", description: "Tỉa gọn viền râu, dưỡng dầu râu.", hot: true },
  { id: "c05", name: "Uốn Hàn Quốc / Premlock", category: "hoa_chat", minutes: 90, price: 350000, emoji: "🌀", color: "#4b5563", description: "Thuốc uốn nhẹ, giữ nếp 2–3 tháng." },
  { id: "c06", name: "Nhuộm thời trang", category: "hoa_chat", minutes: 75, price: 300000, emoji: "🎨", color: "#9a3412", description: "Nâu khói, xám khói, bạch kim (tẩy tính riêng)." },
  { id: "c07", name: "Combo Quý ông (cắt + cạo + đắp mặt nạ)", category: "combo", minutes: 70, price: 250000, salePrice: 199000, emoji: "🎩", color: "#111827", description: "Trọn gói chăm sóc trước sự kiện quan trọng." },
];

export const barbers = [
  { id: "any", name: "Thợ trống sớm nhất", emoji: "⚡", title: "Tiệm xếp thợ" },
  { id: "tuan", name: "Anh Tuấn", emoji: "🧑‍🦱", title: "Master · 10 năm" },
  { id: "khoa", name: "Khoa", emoji: "🧔", title: "Fade & Undercut" },
  { id: "long", name: "Long", emoji: "👨‍🎤", title: "Uốn / Nhuộm" },
  { id: "vy", name: "Vy", emoji: "👩", title: "Gội & chăm sóc" },
];

export const hairStyles = ["Side Part", "Undercut", "Two Block", "Mohican", "Buzz Cut", "Quiff", "Crew Cut"];

export const banners = [
  { title: "Cắt + gội chỉ 120K", subtitle: "Thứ 2 – Thứ 5, trước 17h", from: "#111827", to: "#4b5563", emoji: "💈", eyebrow: "Ưu đãi" },
  { title: "Cạo mặt khăn nóng", subtitle: "Thư giãn kiểu quý ông", from: "#7c2d12", to: "#c08a3e", emoji: "🪒", eyebrow: "Dịch vụ mới" },
];

export const findService = (id?: string) => services.find((s) => s.id === id);

export const bookingsAtom = createBookingStore([
  { id: "b0", title: "Cắt tóc nam tạo kiểu", subtitle: "Anh Tuấn", date: "05/11", time: "18:30", emoji: "💈", status: "done" },
]);

/** Hàng chờ tại tiệm (demo): số đang phục vụ, số người chờ, số của khách nếu đã lấy */
export const queueAtom = atom({ serving: 27, waiting: 3, myNumber: 0 });
