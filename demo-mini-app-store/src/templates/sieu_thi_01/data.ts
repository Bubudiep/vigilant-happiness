import { createCartStore, SimpleProduct } from "../_shared/kit";
import { templatePath } from "../paths";

export const TEMPLATE_ID = "sieu_thi_01";
export const path = (sub = "") => templatePath(TEMPLATE_ID, sub);

export const groceryCategories = [
  { id: "rau", label: "Rau củ", emoji: "🥬" },
  { id: "trai_cay", label: "Trái cây", emoji: "🍎" },
  { id: "thit", label: "Thịt cá", emoji: "🥩" },
  { id: "sua", label: "Sữa & trứng", emoji: "🥛" },
  { id: "kho", label: "Đồ khô", emoji: "🍚" },
  { id: "do_uong", label: "Đồ uống", emoji: "🧃" },
  { id: "banh_keo", label: "Bánh kẹo", emoji: "🍪" },
  { id: "gia_dung", label: "Gia dụng", emoji: "🧴" },
];

export const products: SimpleProduct[] = [
  { id: "g01", name: "Cải ngọt Đà Lạt", emoji: "🥬", color: "#43a047", price: 18000, unit: "Bó 500g", category: "rau", tag: "Tươi" },
  { id: "g02", name: "Cà chua bi", emoji: "🍅", color: "#e53935", price: 32000, salePrice: 25000, unit: "Hộp 500g", category: "rau" },
  { id: "g03", name: "Cà rốt", emoji: "🥕", color: "#fb8c00", price: 22000, unit: "Túi 1kg", category: "rau" },
  { id: "g04", name: "Táo Envy", emoji: "🍎", color: "#c62828", price: 129000, salePrice: 99000, unit: "Túi 1kg", category: "trai_cay" },
  { id: "g05", name: "Chuối Nam Mỹ", emoji: "🍌", color: "#fbc02d", price: 39000, unit: "Nải 1.2kg", category: "trai_cay" },
  { id: "g06", name: "Thịt ba rọi heo", emoji: "🥓", color: "#d84315", price: 75000, unit: "Khay 500g", category: "thit" },
  { id: "g07", name: "Cá hồi phi lê", emoji: "🐟", color: "#ff7043", price: 189000, salePrice: 159000, unit: "Khay 300g", category: "thit" },
  { id: "g08", name: "Sữa tươi không đường", emoji: "🥛", color: "#42a5f5", price: 34000, unit: "Hộp 1L", category: "sua" },
  { id: "g09", name: "Trứng gà ta", emoji: "🥚", color: "#d7a86e", price: 38000, unit: "Hộp 10 quả", category: "sua", tag: "Bán chạy" },
  { id: "g10", name: "Gạo ST25", emoji: "🍚", color: "#a1887f", price: 185000, salePrice: 165000, unit: "Túi 5kg", category: "kho" },
  { id: "g11", name: "Nước cam ép", emoji: "🧃", color: "#ffa000", price: 29000, unit: "Chai 1L", category: "do_uong" },
  { id: "g12", name: "Bánh quy bơ", emoji: "🍪", color: "#8d6e63", price: 55000, unit: "Hộp 400g", category: "banh_keo" },
  { id: "g13", name: "Nước rửa chén", emoji: "🧴", color: "#26a69a", price: 42000, salePrice: 35000, unit: "Chai 750ml", category: "gia_dung" },
];

export const banners = [
  { title: "Giao nhanh 2 giờ", subtitle: "Miễn phí đơn từ 300K", from: "#16a34a", to: "#65c97a", emoji: "🛵", eyebrow: "Xanh Mart" },
  { title: "Thứ 4 Rau Xanh", subtitle: "Đồng giá rau củ 9.900đ", from: "#2e7d32", to: "#9ccc65", emoji: "🥦", eyebrow: "Khuyến mãi" },
];

export const cart = createCartStore();
