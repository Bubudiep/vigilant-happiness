import { createBookingStore, makeSlots } from "../_shared/kit";
import { templatePath } from "../paths";

export const TEMPLATE_ID = "van_phong_luat_01";
export const path = (sub = "") => templatePath(TEMPLATE_ID, sub);

export type PracticeArea = "all" | "dat_dai" | "hon_nhan" | "doanh_nghiep" | "dan_su" | "hinh_su";

export const practiceAreas: { id: PracticeArea; label: string; emoji: string }[] = [
  { id: "all", label: "Tất cả", emoji: "🏛️" },
  { id: "dat_dai", label: "Đất đai & Thừa kế", emoji: "🏠" },
  { id: "hon_nhan", label: "Hôn nhân & Gia đình", emoji: "🤝" },
  { id: "doanh_nghiep", label: "Doanh nghiệp & HĐ", emoji: "💼" },
  { id: "dan_su", label: "Dân sự & Công nợ", emoji: "📑" },
  { id: "hinh_su", label: "Tố tụng & Hình sự", emoji: "🛡️" },
];

export interface Lawyer {
  id: string;
  name: string;
  title: string;
  area: Exclude<PracticeArea, "all">;
  areaLabel: string;
  expYears: number;
  casesWon: number;
  feeOnline: number;
  feeOffice: number;
  emoji: string;
  color: string;
  bio: string;
  featured?: boolean;
}

export const lawyers: Lawyer[] = [
  {
    id: "ls1",
    name: "LS.ThS Trần Minh Chính",
    title: "Luật sư Điều hành · Đoàn LS TP.HCM",
    area: "dat_dai",
    areaLabel: "Đất đai · Tranh chấp & Thừa kế",
    expYears: 18,
    casesWon: 420,
    feeOnline: 500000,
    feeOffice: 1000000,
    emoji: "🏛️",
    color: "#1c1917",
    bio: "Chuyên giải quyết tranh chấp quyền sử dụng đất, phân chia di sản thừa kế, khiếu nại quyết định hành chính về đất đai.",
    featured: true,
  },
  {
    id: "ls2",
    name: "LS. Nguyễn Phương Thảo",
    title: "Trưởng ban Hôn nhân & Dân sự",
    area: "hon_nhan",
    areaLabel: "Ly hôn · Quyền nuôi con & Tài sản",
    expYears: 12,
    casesWon: 310,
    feeOnline: 400000,
    feeOffice: 800000,
    emoji: "🤝",
    color: "#b45309",
    bio: "Tư vấn thủ tục ly hôn thuận tình / đơn phương nhanh gọn, giành quyền nuôi con và phân chia tài sản chung vợ chồng.",
    featured: true,
  },
  {
    id: "ls3",
    name: "LS. Lê Hoàng Bách",
    title: "Trưởng ban Tư vấn Doanh nghiệp & M&A",
    area: "doanh_nghiep",
    areaLabel: "Doanh nghiệp · Hợp đồng & Đầu tư",
    expYears: 14,
    casesWon: 280,
    feeOnline: 600000,
    feeOffice: 1200000,
    emoji: "💼",
    color: "#0369a1",
    bio: "Soạn thảo & rà soát hợp đồng thương mại, tư vấn pháp lý thường xuyên cho doanh nghiệp, giải quyết tranh chấp cổ đông.",
    featured: true,
  },
  {
    id: "ls4",
    name: "LS. Phạm Quốc Hưng",
    title: "Luật sư Tranh tụng Dân sự & Hình sự",
    area: "hinh_su",
    areaLabel: "Bào chữa Hình sự & Thu hồi công nợ",
    expYears: 15,
    casesWon: 350,
    feeOnline: 500000,
    feeOffice: 1000000,
    emoji: "🛡️",
    color: "#7c2d12",
    bio: "Tham gia bào chữa và bảo vệ quyền lợi hợp pháp tại Cơ quan điều tra, Viện kiểm sát và Toà án các cấp.",
  },
];

export const fixedServices = [
  { id: "dv1", name: "Soạn thảo Đơn khởi kiện / Đơn khiếu nại", price: 1500000, time: "Trong 24 giờ", emoji: "✍️" },
  { id: "dv2", name: "Rà soát & Chỉnh sửa Hợp đồng thương mại", price: 2000000, time: "1 – 2 ngày", emoji: "📑" },
  { id: "dv3", name: "Tư vấn thủ tục Ly hôn thuận tình trọn gói", price: 5000000, time: "Nhanh gọn", emoji: "🤝" },
  { id: "dv4", name: "Phòng Pháp chế thuê ngoài cho Doanh nghiệp", price: 6000000, time: "Theo tháng", emoji: "🏢" },
];

export const activeCaseSteps = [
  "Tiếp nhận & nghiên cứu hồ sơ",
  "Thu thập chứng cứ & soạn văn bản",
  "Làm việc với cơ quan có thẩm quyền / Hoà giải",
  "Tham gia phiên toà / Nhận kết quả giải quyết",
];

export const slots = makeSlots(8, 19, 60);

export const consultationsAtom = createBookingStore([
  {
    id: "lc1",
    title: "Tư vấn Tranh chấp lối đi chung & Thừa kế",
    subtitle: "LS.ThS Trần Minh Chính · Tư vấn Video Zalo",
    date: "21/11",
    time: "15:00",
    emoji: "🏛️",
    status: "upcoming",
  },
]);

export function findLawyer(id?: string): Lawyer | undefined {
  return lawyers.find((l) => l.id === id);
}
