import { atom } from "jotai";

import { createBookingStore, nextDays } from "../_shared/kit";
import { templatePath } from "../paths";

export const TEMPLATE_ID = "khach_san_01";
export const path = (sub = "") => templatePath(TEMPLATE_ID, sub);

export interface Room {
  id: string;
  name: string;
  size: number;
  bed: string;
  view: string;
  maxGuests: number;
  price: number;
  emoji: string;
  color: string;
  amenities: string[];
  left?: number;
}

export const rooms: Room[] = [
  { id: "r1", name: "Deluxe Hướng Phố", size: 28, bed: "1 giường đôi", view: "Phố", maxGuests: 2, price: 1150000, emoji: "🛏️", color: "#0f766e", amenities: ["Wi-Fi", "Bữa sáng", "Smart TV", "Minibar"] },
  { id: "r2", name: "Deluxe Hướng Biển", size: 32, bed: "1 giường King", view: "Biển", maxGuests: 2, price: 1650000, emoji: "🌊", color: "#0284c7", amenities: ["Wi-Fi", "Bữa sáng", "Ban công", "Bồn tắm"], left: 2 },
  { id: "r3", name: "Family Suite", size: 48, bed: "2 giường đôi", view: "Biển", maxGuests: 4, price: 2450000, emoji: "👨‍👩‍👧‍👦", color: "#f4a261", amenities: ["Wi-Fi", "Bữa sáng", "Phòng khách", "Bồn tắm"] },
  { id: "r4", name: "Presidential Suite", size: 90, bed: "1 giường King", view: "Toàn cảnh biển", maxGuests: 3, price: 5900000, emoji: "👑", color: "#b45309", amenities: ["Butler", "Bữa sáng", "Jacuzzi", "Đưa đón sân bay"], left: 1 },
];

export const amenities = [
  { emoji: "🏊", label: "Hồ bơi vô cực" },
  { emoji: "🍽️", label: "Nhà hàng" },
  { emoji: "💆", label: "Spa" },
  { emoji: "🏋️", label: "Gym 24/7" },
  { emoji: "🚗", label: "Đưa đón" },
  { emoji: "🏖️", label: "Bãi biển riêng" },
  { emoji: "👶", label: "Kids club" },
  { emoji: "🅿️", label: "Bãi đỗ xe" },
];

export const findRoom = (id?: string) => rooms.find((r) => r.id === id);

/** Thông tin tìm phòng dùng chung giữa trang chủ và trang chi tiết phòng */
export const stayAtom = atom({ checkIn: nextDays()[1].key, nights: 2, guests: 2 });

export const myBookingsAtom = createBookingStore();
