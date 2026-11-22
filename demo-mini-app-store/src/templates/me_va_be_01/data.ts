import { createCartStore, SimpleProduct } from "../_shared/kit";
import { templatePath } from "../paths";

export const TEMPLATE_ID = "me_va_be_01";
export const path = (sub = "") => templatePath(TEMPLATE_ID, sub);

export const ages = [
  { id: "all", label: "Mọi độ tuổi" },
  { id: "0_6m", label: "0–6 tháng" },
  { id: "6_12m", label: "6–12 tháng" },
  { id: "1_3y", label: "1–3 tuổi" },
  { id: "3y", label: "Trên 3 tuổi" },
];

export const babyCategories = [
  { id: "all", label: "Tất cả", emoji: "🧺" },
  { id: "sua", label: "Sữa", emoji: "🍼" },
  { id: "bim", label: "Bỉm tã", emoji: "🧷" },
  { id: "an_dam", label: "Ăn dặm", emoji: "🥣" },
  { id: "do_choi", label: "Đồ chơi", emoji: "🧸" },
  { id: "quan_ao", label: "Quần áo", emoji: "👶" },
  { id: "me", label: "Cho mẹ", emoji: "🤱" },
];

/** `category` = nhóm hàng; tuổi phù hợp lưu ở `ages` */
export const products: (SimpleProduct & { ages: string[] })[] = [
  { id: "b01", name: "Sữa bột số 1 cho bé", emoji: "🍼", color: "#64b5f6", price: 545000, salePrice: 489000, unit: "Lon 800g", category: "sua", ages: ["0_6m"] },
  { id: "b02", name: "Sữa bột số 3 tăng chiều cao", emoji: "🥛", color: "#4fc3f7", price: 489000, unit: "Lon 900g", category: "sua", ages: ["1_3y", "3y"] },
  { id: "b03", name: "Bỉm dán size S", emoji: "🧷", color: "#f48fb1", price: 289000, salePrice: 249000, unit: "Gói 60 miếng", category: "bim", ages: ["0_6m"], tag: "Bán chạy" },
  { id: "b04", name: "Bỉm quần size L", emoji: "🩲", color: "#ce93d8", price: 319000, unit: "Gói 44 miếng", category: "bim", ages: ["6_12m", "1_3y"] },
  { id: "b05", name: "Bột ăn dặm gạo sữa", emoji: "🥣", color: "#ffcc80", price: 95000, unit: "Hộp 200g", category: "an_dam", ages: ["6_12m"] },
  { id: "b06", name: "Bộ thìa bát silicon", emoji: "🥄", color: "#80cbc4", price: 159000, salePrice: 129000, unit: "Bộ 4 món", category: "an_dam", ages: ["6_12m", "1_3y"] },
  { id: "b07", name: "Gấu bông ôm ngủ", emoji: "🧸", color: "#bcaaa4", price: 199000, unit: "30cm", category: "do_choi", ages: ["0_6m", "6_12m", "1_3y"] },
  { id: "b08", name: "Bộ xếp hình gỗ", emoji: "🧩", color: "#aed581", price: 249000, unit: "50 chi tiết", category: "do_choi", ages: ["1_3y", "3y"], tag: "Mới" },
  { id: "b09", name: "Body chip cotton", emoji: "👶", color: "#f8bbd0", price: 129000, unit: "Set 3 cái", category: "quan_ao", ages: ["0_6m", "6_12m"] },
  { id: "b10", name: "Gối chống trào ngược", emoji: "🛏️", color: "#90caf9", price: 359000, salePrice: 299000, unit: "Cho bé sơ sinh", category: "me", ages: ["0_6m"] },
  { id: "b11", name: "Máy hút sữa điện đôi", emoji: "🤱", color: "#f06292", price: 1890000, salePrice: 1590000, unit: "Bảo hành 12 tháng", category: "me", ages: ["0_6m"] },
];

export const articles = [
  { emoji: "🥣", title: "Lịch ăn dặm cho bé 6 tháng tuổi", time: "5 phút đọc" },
  { emoji: "😴", title: "Mẹo giúp bé ngủ xuyên đêm", time: "4 phút đọc" },
  { emoji: "🌡️", title: "Xử lý khi bé sốt mọc răng", time: "6 phút đọc" },
];

export const banners = [
  { title: "Tuần lễ bỉm sữa", subtitle: "Giảm đến 25% + tích điểm x2", from: "#f06292", to: "#ffb74d", emoji: "🍼", eyebrow: "Ưu đãi" },
  { title: "Quà cho bé yêu", subtitle: "Đồ chơi gỗ an toàn, mua 2 giảm 10%", from: "#7e57c2", to: "#f48fb1", emoji: "🧸", eyebrow: "Mới về" },
];

export const cart = createCartStore();
