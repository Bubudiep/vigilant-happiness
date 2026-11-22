import { atom } from "jotai";

import { createCartStore, SimpleProduct } from "../_shared/kit";
import { templatePath } from "../paths";

export const TEMPLATE_ID = "qua_tang_01";
export const path = (sub = "") => templatePath(TEMPLATE_ID, sub);

export const occasions = [
  { id: "all", label: "Tất cả", emoji: "🎁" },
  { id: "sinh_nhat", label: "Sinh nhật", emoji: "🎂" },
  { id: "tinh_yeu", label: "Tình yêu", emoji: "💝" },
  { id: "tot_nghiep", label: "Tốt nghiệp", emoji: "🎓" },
  { id: "tan_gia", label: "Tân gia", emoji: "🏠" },
  { id: "cam_on", label: "Cảm ơn", emoji: "🙏" },
];

export const recipients = [
  { id: "all", label: "Mọi người" },
  { id: "nang", label: "Cho nàng" },
  { id: "chang", label: "Cho chàng" },
  { id: "be", label: "Cho bé" },
  { id: "bo_me", label: "Bố mẹ" },
];

export const gifts: (SimpleProduct & { occasions: string[]; for: string[] })[] = [
  { id: "q01", name: "Hộp quà hoa sáp & nến thơm", emoji: "💐", color: "#e11d48", price: 450000, salePrice: 389000, unit: "Hộp 25x25cm", category: "set", occasions: ["sinh_nhat", "tinh_yeu", "cam_on"], for: ["nang", "bo_me"], tag: "Bán chạy" },
  { id: "q02", name: "Gấu bông kèm thiệp viết tay", emoji: "🧸", color: "#a1887f", price: 290000, unit: "40cm", category: "gau", occasions: ["sinh_nhat", "tinh_yeu"], for: ["nang", "be"] },
  { id: "q03", name: "Ví da khắc tên", emoji: "👛", color: "#795548", price: 520000, salePrice: 459000, unit: "Khắc tên miễn phí", category: "ca_nhan_hoa", occasions: ["sinh_nhat", "tinh_yeu", "tot_nghiep"], for: ["chang"] },
  { id: "q04", name: "Đèn ngủ mặt trăng in ảnh", emoji: "🌕", color: "#f59e0b", price: 350000, unit: "15cm · in ảnh theo yêu cầu", category: "ca_nhan_hoa", occasions: ["sinh_nhat", "tinh_yeu"], for: ["nang", "chang"], tag: "Mới" },
  { id: "q05", name: "Gấu tốt nghiệp + bó hoa", emoji: "🎓", color: "#1d4ed8", price: 380000, unit: "Gấu 25cm + hoa khô", category: "set", occasions: ["tot_nghiep"], for: ["nang", "chang"] },
  { id: "q06", name: "Set trà & bánh quy tân gia", emoji: "🫖", color: "#16a34a", price: 620000, unit: "Hộp gỗ", category: "set", occasions: ["tan_gia", "cam_on"], for: ["bo_me"] },
  { id: "q07", name: "Hộp bút & sổ khắc tên", emoji: "🖋️", color: "#334155", price: 310000, salePrice: 269000, unit: "Khắc tên miễn phí", category: "ca_nhan_hoa", occasions: ["tot_nghiep", "cam_on"], for: ["chang", "nang"] },
  { id: "q08", name: "Hộp đồ chơi gỗ cho bé", emoji: "🧩", color: "#f97316", price: 330000, unit: "Bộ 30 chi tiết", category: "set", occasions: ["sinh_nhat"], for: ["be"] },
  { id: "q09", name: "Khăn lụa tơ tằm", emoji: "🧣", color: "#9333ea", price: 690000, unit: "90x90cm", category: "set", occasions: ["sinh_nhat", "cam_on"], for: ["nang", "bo_me"] },
];

export const banners = [
  { title: "Gói quà miễn phí", subtitle: "Kèm thiệp viết tay cho mọi đơn", from: "#e11d48", to: "#fb7185", emoji: "🎁", eyebrow: "Hộp Quà Xinh" },
  { title: "Giao hoả tốc 2 giờ", subtitle: "Quên quà phút chót? Có tụi mình!", from: "#7c3aed", to: "#c084fc", emoji: "🛵", eyebrow: "Nội thành" },
];

export const wrapStyles = [
  { id: "basic", label: "Giấy kraft · Miễn phí", price: 0 },
  { id: "box", label: "Hộp cứng nơ lụa · +30K", price: 30000 },
  { id: "luxury", label: "Hộp gỗ cao cấp · +80K", price: 80000 },
];

export const giftOptionsAtom = atom({ wrap: "basic", message: "", surprise: true });

export const cart = createCartStore();
