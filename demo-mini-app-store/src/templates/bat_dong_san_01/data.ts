import { atom } from "jotai";

import { templatePath } from "../paths";

export const TEMPLATE_ID = "bat_dong_san_01";
export const path = (sub = "") => templatePath(TEMPLATE_ID, sub);

export type PropertyType = "all" | "can_ho" | "nha_pho" | "dat_nen";

export const propertyTypes: { id: PropertyType; label: string }[] = [
  { id: "all", label: "Tất cả" },
  { id: "can_ho", label: "Căn hộ" },
  { id: "nha_pho", label: "Nhà phố" },
  { id: "dat_nen", label: "Đất nền" },
];

export interface Project {
  id: string;
  name: string;
  type: Exclude<PropertyType, "all">;
  location: string;
  priceFrom: string;
  status: "Đang mở bán" | "Sắp mở bán" | "Đã bàn giao";
  emoji: string;
  color: string;
  area: string;
  legal: string;
  handover: string;
  developer: string;
  units: { name: string; size: string; price: string }[];
  amenities: string[];
  hot?: boolean;
}

export const projects: Project[] = [
  {
    id: "p1",
    name: "Sky Garden Residence",
    type: "can_ho",
    location: "TP. Thủ Đức, TP.HCM",
    priceFrom: "2,1 tỷ",
    status: "Đang mở bán",
    emoji: "🏙️",
    color: "#1e3a5f",
    area: "4,2 ha · 3 tháp 35 tầng",
    legal: "Sổ hồng lâu dài",
    handover: "Quý IV/2027",
    developer: "Công ty CP Đầu tư An Cư (demo)",
    units: [
      { name: "Studio", size: "35 m²", price: "2,1 tỷ" },
      { name: "2 phòng ngủ", size: "68 m²", price: "3,9 tỷ" },
      { name: "3 phòng ngủ", size: "92 m²", price: "5,4 tỷ" },
    ],
    amenities: ["🏊 Hồ bơi", "🌳 Công viên", "🏫 Trường học", "🛒 TTTM", "🏋️ Gym"],
    hot: true,
  },
  {
    id: "p2",
    name: "Riverside Villas",
    type: "nha_pho",
    location: "Nhà Bè, TP.HCM",
    priceFrom: "8,5 tỷ",
    status: "Sắp mở bán",
    emoji: "🏡",
    color: "#2e7d32",
    area: "12 ha · 220 căn",
    legal: "Sổ hồng từng căn",
    handover: "Quý II/2028",
    developer: "Công ty CP Đầu tư An Cư (demo)",
    units: [
      { name: "Nhà phố 5x20", size: "100 m²", price: "8,5 tỷ" },
      { name: "Biệt thự song lập", size: "200 m²", price: "16 tỷ" },
    ],
    amenities: ["🛥️ Bến du thuyền", "🌳 Công viên ven sông", "🔒 An ninh 24/7"],
    hot: true,
  },
  {
    id: "p3",
    name: "Green Land Long An",
    type: "dat_nen",
    location: "Đức Hoà, Long An",
    priceFrom: "1,2 tỷ",
    status: "Đang mở bán",
    emoji: "🌾",
    color: "#c9a227",
    area: "25 ha · 600 nền",
    legal: "Sổ đỏ từng nền",
    handover: "Bàn giao ngay",
    developer: "Công ty TNHH Địa ốc Xanh (demo)",
    units: [
      { name: "Nền 5x20", size: "100 m²", price: "1,2 tỷ" },
      { name: "Nền góc 7x20", size: "140 m²", price: "1,9 tỷ" },
    ],
    amenities: ["🛣️ Mặt tiền tỉnh lộ", "🏭 Gần KCN", "🏪 Chợ"],
  },
  {
    id: "p4",
    name: "The Harmony Tower",
    type: "can_ho",
    location: "Quận 7, TP.HCM",
    priceFrom: "3,6 tỷ",
    status: "Đã bàn giao",
    emoji: "🏢",
    color: "#6d28d9",
    area: "1,8 ha · 2 tháp",
    legal: "Đã có sổ hồng",
    handover: "Đã bàn giao 2025",
    developer: "Công ty CP Đầu tư An Cư (demo)",
    units: [{ name: "2 phòng ngủ", size: "72 m²", price: "3,6 tỷ" }],
    amenities: ["🏊 Hồ bơi", "🧒 Khu vui chơi", "🛒 Siêu thị"],
  },
];

export const findProject = (id?: string) => projects.find((p) => p.id === id);

export const savedAtom = atom<string[]>([]);
