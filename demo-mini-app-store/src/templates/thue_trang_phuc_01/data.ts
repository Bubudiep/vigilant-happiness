import { createBookingStore } from "../_shared/kit";
import { templatePath } from "../paths";

export const TEMPLATE_ID = "thue_trang_phuc_01";
export const path = (sub = "") => templatePath(TEMPLATE_ID, sub);

export const costumeTypes = [
  { id: "all", label: "Tất cả", emoji: "👘" },
  { id: "ao_dai", label: "Áo dài", emoji: "👗" },
  { id: "co_phuc", label: "Cổ phục", emoji: "🏯" },
  { id: "vay_cuoi", label: "Váy cưới", emoji: "👰" },
  { id: "vest", label: "Vest", emoji: "🤵" },
  { id: "cosplay", label: "Cosplay", emoji: "🦸" },
  { id: "bieu_dien", label: "Biểu diễn", emoji: "💃" },
];

export interface Costume {
  id: string;
  name: string;
  type: string;
  emoji: string;
  color: string;
  pricePerDay: number;
  deposit: number;
  sizes: string[];
  includes: string[];
  hot?: boolean;
  /** Số bộ còn trống */
  stock: number;
}

export const costumes: Costume[] = [
  { id: "c1", name: "Áo dài lụa trơn đỏ", type: "ao_dai", emoji: "👗", color: "#c62828", pricePerDay: 150000, deposit: 500000, sizes: ["S", "M", "L", "XL"], includes: ["Áo dài", "Quần lụa", "Khăn vấn"], hot: true, stock: 6 },
  { id: "c2", name: "Áo dài cưới gấm vàng", type: "ao_dai", emoji: "💛", color: "#d4a017", pricePerDay: 350000, deposit: 1000000, sizes: ["S", "M", "L"], includes: ["Áo dài", "Mấn", "Quần"], stock: 2 },
  { id: "c3", name: "Nhật Bình cung đình", type: "co_phuc", emoji: "🏯", color: "#1565c0", pricePerDay: 400000, deposit: 1500000, sizes: ["M", "L"], includes: ["Áo Nhật Bình", "Váy", "Mấn", "Trang sức"], hot: true, stock: 2 },
  { id: "c4", name: "Áo tấc nam", type: "co_phuc", emoji: "🎎", color: "#2e7d32", pricePerDay: 300000, deposit: 1000000, sizes: ["M", "L", "XL"], includes: ["Áo tấc", "Khăn vấn", "Quần"], stock: 3 },
  { id: "c5", name: "Váy cưới đuôi cá", type: "vay_cuoi", emoji: "👰", color: "#f3e5f5", pricePerDay: 900000, deposit: 3000000, sizes: ["S", "M"], includes: ["Váy", "Voan", "Găng tay"], hot: true, stock: 1 },
  { id: "c6", name: "Vest chú rể 3 món", type: "vest", emoji: "🤵", color: "#263238", pricePerDay: 400000, deposit: 1500000, sizes: ["M", "L", "XL"], includes: ["Áo vest", "Quần", "Gile", "Nơ"], stock: 4 },
  { id: "c7", name: "Siêu anh hùng (trẻ em)", type: "cosplay", emoji: "🦸", color: "#d32f2f", pricePerDay: 120000, deposit: 300000, sizes: ["110", "120", "130"], includes: ["Bộ đồ", "Áo choàng", "Mặt nạ"], stock: 8 },
  { id: "c8", name: "Kimono hoa anh đào", type: "cosplay", emoji: "🌸", color: "#ec407a", pricePerDay: 250000, deposit: 800000, sizes: ["S", "M"], includes: ["Kimono", "Obi", "Guốc"], stock: 3 },
  { id: "c9", name: "Váy múa sân khấu", type: "bieu_dien", emoji: "💃", color: "#7b1fa2", pricePerDay: 180000, deposit: 500000, sizes: ["S", "M", "L"], includes: ["Váy", "Phụ kiện tóc"], stock: 10 },
];

export const findCostume = (id?: string) => costumes.find((c) => c.id === id);

export const services = [
  { emoji: "💄", label: "Trang điểm" },
  { emoji: "📸", label: "Chụp ảnh" },
  { emoji: "🪡", label: "Sửa vừa người" },
  { emoji: "🚚", label: "Giao tận nơi" },
];

export const rentalsAtom = createBookingStore([
  { id: "rt0", title: "Áo dài lụa trơn đỏ · Size M", subtitle: "Thuê 2 ngày · Đã trả cọc", date: "20/10", emoji: "👗", status: "done" },
]);
