import { createBookingStore, createCartStore } from "../_shared/kit";
import { templatePath } from "../paths";

export const TEMPLATE_ID = "bida_01";
export const path = (sub = "") => templatePath(TEMPLATE_ID, sub);

export type TableType = "pool" | "carom" | "snooker" | "vip";

export const tableTypes: { id: TableType; label: string; pricePerHour: number; note: string }[] = [
  { id: "pool", label: "Pool (lỗ)", pricePerHour: 60000, note: "Bàn 9 feet" },
  { id: "carom", label: "Carom (phăng)", pricePerHour: 70000, note: "Bàn 3 băng" },
  { id: "snooker", label: "Snooker", pricePerHour: 90000, note: "Bàn 12 feet" },
  { id: "vip", label: "Phòng VIP", pricePerHour: 150000, note: "Máy lạnh, sofa riêng" },
];

export type TableStatus = "free" | "playing" | "reserved";

export interface PoolTable {
  no: number;
  type: TableType;
  status: TableStatus;
  /** Phút đã chơi (nếu đang chơi) */
  minutes?: number;
}

const T = (no: number, type: TableType, status: TableStatus, minutes?: number): PoolTable => ({ no, type, status, minutes });
export const tables: PoolTable[] = [
  T(1, "pool", "playing", 82),
  T(2, "pool", "free"),
  T(3, "pool", "playing", 25),
  T(4, "pool", "reserved"),
  T(5, "pool", "playing", 47),
  T(6, "pool", "free"),
  T(7, "carom", "playing", 110),
  T(8, "carom", "free"),
  T(9, "carom", "free"),
  T(10, "snooker", "playing", 64),
  T(11, "snooker", "free"),
  T(12, "vip", "reserved"),
  T(13, "vip", "free"),
];

export const tableLabel = (t: PoolTable) => `Bàn ${String(t.no).padStart(2, "0")}`;
export const typeOf = (id: TableType) => tableTypes.find((t) => t.id === id)!;

/** Phiên chơi đang diễn ra của khách (demo): bàn 05, bắt đầu 47 phút trước */
export const MY_TABLE = tables.find((t) => t.no === 5)!;
export const SESSION_START = Date.now() - 47 * 60 * 1000;

export const menuCategories = [
  { id: "all", label: "Tất cả" },
  { id: "nuoc", label: "Nước ngọt" },
  { id: "bia", label: "Bia" },
  { id: "an_vat", label: "Ăn vặt" },
  { id: "phu_kien", label: "Phụ kiện" },
];

export const menu = [
  { id: "m1", name: "Sting dâu", category: "nuoc", price: 18000, emoji: "🥤", color: "#e53935" },
  { id: "m2", name: "Trà đá", category: "nuoc", price: 5000, emoji: "🧊", color: "#90a4ae" },
  { id: "m3", name: "Cà phê sữa", category: "nuoc", price: 22000, emoji: "☕", color: "#6d4c41" },
  { id: "m4", name: "Bia lon", category: "bia", price: 25000, emoji: "🍺", color: "#f9a825" },
  { id: "m5", name: "Bia tháp 3L", category: "bia", price: 180000, emoji: "🍻", color: "#ef6c00" },
  { id: "m6", name: "Khô gà lá chanh", category: "an_vat", price: 45000, emoji: "🍗", color: "#d84315" },
  { id: "m7", name: "Hướng dương", category: "an_vat", price: 15000, emoji: "🌻", color: "#fbc02d" },
  { id: "m8", name: "Mì xào bò", category: "an_vat", price: 50000, emoji: "🍜", color: "#bf360c" },
  { id: "m9", name: "Lơ đánh cơ", category: "phu_kien", price: 10000, emoji: "🟦", color: "#1565c0" },
  { id: "m10", name: "Găng tay bida", category: "phu_kien", price: 40000, emoji: "🧤", color: "#424242" },
];

export const order = createCartStore();
export const reservationsAtom = createBookingStore();
