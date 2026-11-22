import { createBookingStore, makeSlots } from "../_shared/kit";
import { templatePath } from "../paths";

export const TEMPLATE_ID = "cong_chung_01";
export const path = (sub = "") => templatePath(TEMPLATE_ID, sub);

export interface NotaryService {
  id: string;
  name: string;
  category: "nha_dat" | "uy_quyen" | "thua_ke" | "xe" | "ban_sao";
  timeEstimate: string;
  baseFee: number;
  feeNote: string;
  emoji: string;
  color: string;
  documents: string[];
  popular?: boolean;
}

export const serviceCategories = [
  { id: "all", label: "Tất cả" },
  { id: "nha_dat", label: "Nhà đất" },
  { id: "uy_quyen", label: "Uỷ quyền" },
  { id: "thua_ke", label: "Di chúc / Thừa kế" },
  { id: "xe", label: "Ô tô / Xe máy" },
  { id: "ban_sao", label: "Sao y / Dịch thuật" },
] as const;

export const notaryServices: NotaryService[] = [
  {
    id: "cc1",
    name: "Hợp đồng Mua bán / Chuyển nhượng Nhà đất",
    category: "nha_dat",
    timeEstimate: "30 – 45 phút",
    baseFee: 1200000,
    feeNote: "Theo biểu phí Thông tư 257/2016/TT-BTC",
    emoji: "🏠",
    color: "#1e3a8a",
    popular: true,
    documents: [
      "Giấy chứng nhận quyền sử dụng đất (Sổ hồng / Sổ đỏ) bản gốc",
      "CCCD / Căn cước của Bên bán và Bên mua (cả hai vợ chồng)",
      "Giấy chứng nhận kết hôn hoặc Giấy xác nhận tình trạng độc thân",
      "Hợp đồng đặt cọc (nếu có) hoặc thông tin giá chuyển nhượng",
    ],
  },
  {
    id: "cc2",
    name: "Hợp đồng Uỷ quyền / Giấy uỷ quyền",
    category: "uy_quyen",
    timeEstimate: "15 – 20 phút",
    baseFee: 350000,
    feeNote: "Phí công chứng + thù lao soạn thảo văn bản",
    emoji: "✍️",
    color: "#b45309",
    popular: true,
    documents: [
      "CCCD / Căn cước bản gốc của Bên uỷ quyền và Bên nhận uỷ quyền",
      "Giấy tờ chứng minh quyền sở hữu tài sản hoặc nội dung uỷ quyền",
      "Giấy đăng ký kết hôn (nếu uỷ quyền tài sản chung vợ chồng)",
    ],
  },
  {
    id: "cc3",
    name: "Hợp đồng Thế chấp tài sản Ngân hàng",
    category: "nha_dat",
    timeEstimate: "30 phút",
    baseFee: 950000,
    feeNote: "Hỗ trợ ký tại Ngân hàng hoặc tại nhà",
    emoji: "🏛️",
    color: "#0369a1",
    popular: true,
    documents: [
      "Sổ hồng / Giấy đăng ký tài sản bản gốc",
      "CCCD & Giấy xác nhận tình trạng hôn nhân của bên thế chấp",
      "Dự thảo hợp đồng thế chấp từ Ngân hàng",
    ],
  },
  {
    id: "cc4",
    name: "Lập Di chúc / Văn bản Khai nhận Thừa kế",
    category: "thua_ke",
    timeEstimate: "45 – 60 phút",
    baseFee: 800000,
    feeNote: "Có công chứng viên tư vấn riêng tư 1-1",
    emoji: "📜",
    color: "#7c3aed",
    popular: true,
    documents: [
      "CCCD của người lập di chúc hoặc những người thừa kế",
      "Giấy tờ chứng minh quyền sở hữu tài sản (Sổ hồng, Sổ tiết kiệm...)",
      "Giấy khám sức khoẻ minh mẫn (đối với người cao tuổi lập di chúc)",
    ],
  },
  {
    id: "cc5",
    name: "Hợp đồng Mua bán Ô tô / Xe máy",
    category: "xe",
    timeEstimate: "20 phút",
    baseFee: 450000,
    feeNote: "Hỗ trợ rút hồ sơ gốc & sang tên",
    emoji: "🚗",
    color: "#0f766e",
    documents: [
      "Giấy đăng ký xe (Cà vẹt) & Đăng kiểm xe bản gốc",
      "CCCD & Giấy xác nhận tình trạng hôn nhân của Bên bán",
      "CCCD của Bên mua",
    ],
  },
  {
    id: "cc6",
    name: "Chứng thực Bản sao (Sao y) & Dịch thuật công chứng",
    category: "ban_sao",
    timeEstimate: "Lấy ngay 10 phút",
    baseFee: 50000,
    feeNote: "2.000đ/trang từ trang thứ 1–2 (lấy ngay)",
    emoji: "📑",
    color: "#dc2626",
    documents: [
      "Bản chính giấy tờ cần sao y hoặc dịch thuật",
      "CCCD của người yêu cầu chứng thực (khi dịch thuật)",
    ],
  },
];

export const notaries = [
  { id: "ccv1", name: "CCV. Nguyễn Văn Tâm", title: "Trưởng Văn phòng · 20 năm KN", badge: "Trưởng VP" },
  { id: "ccv2", name: "CCV. Trần Thị Minh Đức", title: "Công chứng viên · 15 năm KN", badge: "Chuyên BĐS" },
  { id: "ccv3", name: "CCV. Hoàng Quốc Bảo", title: "Công chứng viên · Hỗ trợ ngoài trụ sở", badge: "Ký tận nơi" },
];

export const slots = makeSlots(8, 17, 30);

export const bookingsAtom = createBookingStore([
  {
    id: "nb1",
    title: "HĐ Chuyển nhượng Nhà đất (Đã gửi ảnh sổ)",
    subtitle: "CCV. Nguyễn Văn Tâm · Ký tại Văn phòng",
    date: "20/11",
    time: "09:00",
    emoji: "🏠",
    status: "upcoming",
  },
]);

/** Tính phí công chứng tham khảo theo giá trị tài sản (triệu đồng) theo biểu phí nhà nước. */
export function estimateNotaryFee(millionVnd: number): number {
  const v = Math.max(0, millionVnd) * 1_000_000;
  if (v <= 50_000_000) return 50_000;
  if (v <= 100_000_000) return 100_000;
  if (v <= 1_000_000_000) return Math.round(v * 0.001);
  if (v <= 3_000_000_000) return Math.round(1_000_000 + (v - 1_000_000_000) * 0.0006);
  if (v <= 5_000_000_000) return Math.round(2_200_000 + (v - 3_000_000_000) * 0.0005);
  return Math.min(70_000_000, Math.round(3_200_000 + (v - 5_000_000_000) * 0.0004));
}

export function findNotaryService(id?: string): NotaryService | undefined {
  return notaryServices.find((s) => s.id === id);
}
