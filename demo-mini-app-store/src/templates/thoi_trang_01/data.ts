/** Dữ liệu giả cho mẫu thời trang. */

export type ProductCategory = "ao" | "quan" | "vay" | "phu_kien";

export interface ProductColor {
  name: string;
  hex: string;
}

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  price: number;
  salePrice?: number;
  colors: ProductColor[];
  sizes: string[];
  rating: number;
  sold: number;
  isNew?: boolean;
  flashSale?: boolean;
  description: string;
}

export const productCategories: { id: ProductCategory; label: string }[] = [
  { id: "ao", label: "Áo" },
  { id: "quan", label: "Quần" },
  { id: "vay", label: "Váy đầm" },
  { id: "phu_kien", label: "Phụ kiện" },
];

const SIZES = ["S", "M", "L", "XL"];

export const products: Product[] = [
  {
    id: "p01",
    name: "Áo sơ mi linen tay dài",
    category: "ao",
    price: 459000,
    salePrice: 359000,
    colors: [
      { name: "Trắng kem", hex: "#efe8dc" },
      { name: "Xanh nhạt", hex: "#a9c4d8" },
    ],
    sizes: SIZES,
    rating: 4.8,
    sold: 1240,
    flashSale: true,
    description: "Chất liệu linen thoáng mát, form suông dễ phối đồ. Phù hợp đi làm và dạo phố.",
  },
  {
    id: "p02",
    name: "Áo thun cotton basic",
    category: "ao",
    price: 199000,
    colors: [
      { name: "Đen", hex: "#232323" },
      { name: "Trắng", hex: "#f4f4f4" },
      { name: "Be", hex: "#d8c3a5" },
    ],
    sizes: SIZES,
    rating: 4.9,
    sold: 3580,
    description: "Cotton 100% co giãn 2 chiều, giữ form sau nhiều lần giặt.",
  },
  {
    id: "p03",
    name: "Quần âu ống suông",
    category: "quan",
    price: 529000,
    salePrice: 429000,
    colors: [
      { name: "Đen", hex: "#262626" },
      { name: "Nâu", hex: "#7a5c45" },
    ],
    sizes: ["26", "27", "28", "29", "30"],
    rating: 4.7,
    sold: 860,
    flashSale: true,
    description: "Lưng cao tôn dáng, vải tuyết mưa ít nhăn.",
  },
  {
    id: "p04",
    name: "Quần jeans ống rộng",
    category: "quan",
    price: 489000,
    colors: [{ name: "Xanh denim", hex: "#5b7fa6" }],
    sizes: ["26", "27", "28", "29", "30"],
    rating: 4.6,
    sold: 712,
    isNew: true,
    description: "Denim cotton mềm, wash nhẹ, phong cách trẻ trung.",
  },
  {
    id: "p05",
    name: "Đầm midi hoa nhí",
    category: "vay",
    price: 659000,
    salePrice: 499000,
    colors: [
      { name: "Hồng phấn", hex: "#e8b4b8" },
      { name: "Xanh mint", hex: "#a8d5c2" },
    ],
    sizes: SIZES,
    rating: 4.9,
    sold: 945,
    flashSale: true,
    description: "Voan lụa 2 lớp, dáng xoè nhẹ, thắt eo nữ tính.",
  },
  {
    id: "p06",
    name: "Chân váy chữ A",
    category: "vay",
    price: 359000,
    colors: [
      { name: "Đen", hex: "#2a2a2a" },
      { name: "Kem", hex: "#eadfcd" },
    ],
    sizes: SIZES,
    rating: 4.7,
    sold: 530,
    isNew: true,
    description: "Dáng chữ A che khuyết điểm, có lớp lót trong.",
  },
  {
    id: "p07",
    name: "Túi tote canvas",
    category: "phu_kien",
    price: 259000,
    salePrice: 199000,
    colors: [
      { name: "Be", hex: "#d9c7a7" },
      { name: "Đen", hex: "#2b2b2b" },
    ],
    sizes: ["Free size"],
    rating: 4.8,
    sold: 1890,
    flashSale: true,
    description: "Canvas dày dặn, có ngăn khoá kéo bên trong, đựng vừa laptop 14 inch.",
  },
  {
    id: "p08",
    name: "Áo blazer dáng lửng",
    category: "ao",
    price: 899000,
    colors: [
      { name: "Be", hex: "#cbb79b" },
      { name: "Đen", hex: "#1f1f1f" },
    ],
    sizes: SIZES,
    rating: 4.8,
    sold: 402,
    isNew: true,
    description: "Blazer cắt lửng hiện đại, vai đệm nhẹ, phù hợp công sở.",
  },
];

export const banners = [
  { title: "BST Thu Đông", subtitle: "Giảm đến 30%", from: "#2b2b2b", to: "#7a5c45" },
  { title: "Hàng mới về", subtitle: "Mỗi thứ 6 hằng tuần", from: "#c8a27a", to: "#e9d8c0" },
  { title: "Thành viên mới", subtitle: "Tặng voucher 50K", from: "#5b7fa6", to: "#a9c4d8" },
];

export function findProduct(id?: string): Product | undefined {
  return products.find((p) => p.id === id);
}

export function effectivePrice(p: Product): number {
  return p.salePrice ?? p.price;
}
