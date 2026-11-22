import { createBookingStore } from "../_shared/kit";
import { templatePath } from "../paths";

export const TEMPLATE_ID = "phong_kham_01";
export const path = (sub = "") => templatePath(TEMPLATE_ID, sub);

export const specialties = [
  { id: "all", label: "Tất cả", emoji: "🏥" },
  { id: "noi", label: "Nội tổng quát", emoji: "🩺" },
  { id: "nhi", label: "Nhi khoa", emoji: "👶" },
  { id: "da_lieu", label: "Da liễu", emoji: "🧴" },
  { id: "rang", label: "Răng hàm mặt", emoji: "🦷" },
  { id: "mat", label: "Mắt", emoji: "👁️" },
  { id: "tmh", label: "Tai mũi họng", emoji: "👂" },
  { id: "xet_nghiem", label: "Xét nghiệm", emoji: "🧪" },
];

export interface Doctor {
  id: string;
  name: string;
  title: string;
  specialty: string;
  years: number;
  rating: number;
  fee: number;
  emoji: string;
}

export const doctors: Doctor[] = [
  { id: "dr1", name: "BS. Nguyễn Minh An", title: "Thạc sĩ", specialty: "noi", years: 15, rating: 4.9, fee: 250000, emoji: "👨‍⚕️" },
  { id: "dr2", name: "BS. Trần Thu Hà", title: "Bác sĩ CKI", specialty: "nhi", years: 12, rating: 4.9, fee: 250000, emoji: "👩‍⚕️" },
  { id: "dr3", name: "BS. Lê Quốc Bảo", title: "Bác sĩ CKII", specialty: "da_lieu", years: 18, rating: 4.8, fee: 300000, emoji: "👨‍⚕️" },
  { id: "dr4", name: "BS. Phạm Ngọc Lan", title: "Bác sĩ", specialty: "rang", years: 8, rating: 4.7, fee: 200000, emoji: "👩‍⚕️" },
  { id: "dr5", name: "BS. Võ Thành Long", title: "Thạc sĩ", specialty: "mat", years: 10, rating: 4.8, fee: 250000, emoji: "👨‍⚕️" },
  { id: "dr6", name: "BS. Đặng Mai Anh", title: "Bác sĩ CKI", specialty: "tmh", years: 9, rating: 4.7, fee: 220000, emoji: "👩‍⚕️" },
];

export const findDoctor = (id?: string) => doctors.find((d) => d.id === id);
export const specialtyLabel = (id: string) => specialties.find((s) => s.id === id)?.label ?? id;

export const tips = [
  { emoji: "💧", title: "Uống đủ 2 lít nước mỗi ngày" },
  { emoji: "🦠", title: "Phòng cúm mùa cho trẻ nhỏ" },
  { emoji: "🩸", title: "Khi nào cần xét nghiệm máu định kỳ?" },
];

export const appointmentsAtom = createBookingStore([
  { id: "a0", title: "BS. Nguyễn Minh An", subtitle: "Nội tổng quát · Phòng 203", date: "20/10", time: "08:30", emoji: "🩺", status: "done" },
]);
