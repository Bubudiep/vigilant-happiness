import { atom } from "jotai";

import { createBookingStore, createCartStore } from "../_shared/kit";
import { templatePath } from "../paths";

export const TEMPLATE_ID = "tiem_net_01";
export const path = (sub = "") => templatePath(TEMPLATE_ID, sub);

export type ZoneId = "thuong" | "vip" | "thi_dau" | "stream";

export const zones: { id: ZoneId; label: string; pricePerHour: number; spec: string; image: string }[] = [
  { id: "thuong", label: "Khu thường", pricePerHour: 10000, spec: "i5-12400F · RTX 3060 · 144Hz", image: "z01" },
  { id: "vip", label: "Khu VIP", pricePerHour: 15000, spec: "i7-13700F · RTX 4070 · 240Hz · ghế DXRacer", image: "z02" },
  { id: "thi_dau", label: "Phòng thi đấu 5v5", pricePerHour: 18000, spec: "Phòng kín 5 máy · RTX 4070 Ti · 360Hz", image: "z03" },
  { id: "stream", label: "Phòng stream / đôi", pricePerHour: 25000, spec: "2 máy RTX 4080 · mic, cam, đèn RGB", image: "z04" },
];

export type MachineStatus = "free" | "busy" | "reserved";
export interface Machine {
  no: number;
  zone: ZoneId;
  status: MachineStatus;
  /** Phút còn lại của khách đang chơi */
  left?: number;
}

const M = (no: number, zone: ZoneId, status: MachineStatus, left?: number): Machine => ({ no, zone, status, left });
export const machines: Machine[] = [
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => M(n, "thuong", [2, 5, 9, 12].includes(n) ? "free" : n === 7 ? "reserved" : "busy", (n * 17) % 120)),
  ...[21, 22, 23, 24, 25, 26].map((n) => M(n, "vip", [23, 26].includes(n) ? "free" : "busy", (n * 13) % 90)),
  ...[31, 32, 33, 34, 35].map((n) => M(n, "thi_dau", "free")),
  ...[41, 42].map((n) => M(n, "stream", n === 41 ? "busy" : "free", 45)),
];

export const machineLabel = (m: Machine) => `Máy ${String(m.no).padStart(2, "0")}`;
export const zoneOf = (id: ZoneId) => zones.find((z) => z.id === id)!;

/** Phiên chơi của khách (demo): máy 23, còn 2h15 trong ví */
export const MY_MACHINE = machines.find((m) => m.no === 23)!;
export const walletAtom = atom({ minutes: 135, balance: 85000 });

export const menuCategories = [
  { id: "all", label: "Tất cả" },
  { id: "mi", label: "Mì & cơm" },
  { id: "nuoc", label: "Nước" },
  { id: "an_vat", label: "Ăn vặt" },
  { id: "the", label: "Thẻ game" },
];

export const menu = [
  { id: "m1", name: "Mì xào bò trứng", category: "mi", price: 35000, emoji: "🍜", color: "#ea580c" },
  { id: "m2", name: "Mì cay Hàn Quốc", category: "mi", price: 40000, emoji: "🌶️", color: "#dc2626" },
  { id: "m3", name: "Cơm rang dưa bò", category: "mi", price: 45000, emoji: "🍛", color: "#ca8a04" },
  { id: "m4", name: "Sting dâu", category: "nuoc", price: 15000, emoji: "🥤", color: "#e11d48" },
  { id: "m5", name: "Trà chanh", category: "nuoc", price: 15000, emoji: "🍋", color: "#65a30d" },
  { id: "m6", name: "Bò húc", category: "nuoc", price: 18000, emoji: "⚡", color: "#2563eb" },
  { id: "m7", name: "Xúc xích nướng", category: "an_vat", price: 15000, emoji: "🌭", color: "#b45309" },
  { id: "m8", name: "Khoai tây chiên", category: "an_vat", price: 25000, emoji: "🍟", color: "#f59e0b" },
  { id: "m9", name: "Thẻ Garena 100K", category: "the", price: 100000, emoji: "🎮", color: "#7c3aed" },
  { id: "m10", name: "Thẻ Steam Wallet 200K", category: "the", price: 200000, emoji: "🕹️", color: "#1e293b" },
];

export const topups = [
  { amount: 50000, bonus: 0 },
  { amount: 100000, bonus: 10000 },
  { amount: 200000, bonus: 30000 },
  { amount: 500000, bonus: 100000 },
];

export const order = createCartStore();
export const reservationsAtom = createBookingStore();
