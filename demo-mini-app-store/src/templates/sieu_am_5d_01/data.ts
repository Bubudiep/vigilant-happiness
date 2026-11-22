import { atom } from "jotai";

import { createBookingStore, makeSlots } from "../_shared/kit";
import { templatePath } from "../paths";

export const TEMPLATE_ID = "sieu_am_5d_01";
export const path = (sub = "") => templatePath(TEMPLATE_ID, sub);

export interface UltrasoundPackage {
  id: string;
  name: string;
  tag: string;
  weeks: string;
  duration: number;
  price: number;
  salePrice?: number;
  emoji: string;
  color: string;
  highlights: string[];
  hot?: boolean;
}

export interface PregnancyMilestone {
  id: string;
  weekFrom: number;
  weekTo: number;
  label: string;
  title: string;
  gold?: boolean;
  ultrasound: string;
  tests: string[];
  prepNote: string;
  packageId: string;
}

export interface DailyReminder {
  id: string;
  time: string;
  title: string;
  note: string;
  emoji: string;
  done: boolean;
}

export const pregnancyWeekAtom = atom<number>(22);

/** Trạng thái bật/tắt nhận tin nhắn Zalo nhắc lịch cho từng mốc khám */
export const milestoneReminderAtom = atom<Record<string, boolean>>({
  m1: true,
  m2: true,
  m3: true,
  m4: true,
  m5: true,
  m6: true,
  m7: true,
  m8: false,
});

export const dailyRemindersAtom = atom<DailyReminder[]>([
  {
    id: "r1",
    time: "07:30",
    title: "Uống 1 viên Canxi + DHA",
    note: "Uống sau bữa sáng, cách viên Sắt tối thiểu 2 tiếng",
    emoji: "🥛",
    done: true,
  },
  {
    id: "r2",
    time: "11:30",
    title: "Uống 1 viên Sắt hữu cơ + Axit Folic",
    note: "Uống kèm nước cam hoặc nước lọc, tránh uống cùng trà/sữa",
    emoji: "💊",
    done: true,
  },
  {
    id: "r3",
    time: "15:00",
    title: "Uống đủ 2.2L nước ấm trong ngày",
    note: "Giúp nước ối trong để hình ảnh siêu âm 5D rõ nét nhất",
    emoji: "💧",
    done: false,
  },
  {
    id: "r4",
    time: "20:30",
    title: "Đếm cử động thai (Thai máy)",
    note: "Nằm nghiêng trái 1 giờ sau ăn tối (bình thường >= 4 lần/giờ)",
    emoji: "👶",
    done: false,
  },
]);

export const pregnancyMilestones: PregnancyMilestone[] = [
  {
    id: "m1",
    weekFrom: 6,
    weekTo: 8,
    label: "6 – 8 tuần",
    title: "Khám thai lần đầu & Tim thai",
    ultrasound: "Siêu âm 2D xác định túi thai trong tử cung, phôi thai & tim thai",
    tests: ["Công thức máu, Nhóm máu ABO/Rh", "Đường huyết lúc đói", "Viêm gan B, HIV, Giang mai, Rubella"],
    prepNote: "Nhịn ăn sáng nếu làm xét nghiệm máu tổng quát.",
    packageId: "u5",
  },
  {
    id: "m2",
    weekFrom: 9,
    weekTo: 10,
    label: "9 – 10 tuần",
    title: "Xét nghiệm sàng lọc NIPT sớm",
    ultrasound: "Siêu âm kiểm tra sự phát triển phôi thai",
    tests: ["Xét nghiệm máu mẹ NIPT (sàng lọc 23 cặp NST)", "Tổng phân tích nước tiểu"],
    prepNote: "Không cần nhịn ăn trước khi lấy máu làm xét nghiệm NIPT.",
    packageId: "u4",
  },
  {
    id: "m3",
    weekFrom: 11,
    weekTo: 13,
    label: "11 – 13w6d",
    title: "Mốc Vàng 1 · Đo độ mờ da gáy",
    gold: true,
    ultrasound: "Siêu âm 4D/5D đo khoảng sáng sau gáy (NT), xương mũi, Doppler ống tĩnh mạch",
    tests: ["Double Test (nếu chưa làm NIPT)", "Sàng lọc nguy cơ Tiền sản giật"],
    prepNote: "Mốc bắt buộc thực hiện trước 13 tuần 6 ngày, qua mốc này chỉ số NT không còn chính xác.",
    packageId: "u3",
  },
  {
    id: "m4",
    weekFrom: 16,
    weekTo: 18,
    label: "16 – 18 tuần",
    title: "Khám định kỳ & Tiêm uốn ván mũi 1",
    ultrasound: "Siêu âm đánh giá phát triển thai & lượng nước ối",
    tests: ["Triple Test (nếu chưa làm NIPT/Double Test)", "Tổng phân tích nước tiểu", "Tiêm vắc-xin Uốn ván mũi 1"],
    prepNote: "Uống nhiều nước trước khi siêu âm 30 phút.",
    packageId: "u5",
  },
  {
    id: "m5",
    weekFrom: 18,
    weekTo: 24,
    label: "18 – 24 tuần",
    title: "Mốc Vàng 2 · Siêu âm 5D Hình thái học",
    gold: true,
    ultrasound: "Siêu âm 5D HDLive khảo sát 40+ chỉ số hình thái: não, tim, môi, cột sống, tứ chi + Đo kênh cổ tử cung",
    tests: ["Tổng phân tích nước tiểu", "Kiểm tra huyết áp & cân nặng mẹ"],
    prepNote: "Mẹ nên ăn nhẹ trước khi siêu âm 30 phút để bé thức và cử động, dễ chụp ảnh mặt 5D đẹp.",
    packageId: "u1",
  },
  {
    id: "m6",
    weekFrom: 24,
    weekTo: 28,
    label: "24 – 28 tuần",
    title: "Tầm soát Tiểu đường thai kỳ",
    ultrasound: "Siêu âm theo dõi cân nặng thai nhi & nhau thai",
    tests: [
      "Nghiệm pháp dung nạp đường huyết 75g (lấy máu 3 lần: đói – sau 1h – sau 2h)",
      "Công thức máu (kiểm tra thiếu máu)",
      "Tiêm vắc-xin Uốn ván mũi 2",
    ],
    prepNote: "⚠️ BẮT BUỘC nhịn ăn tối thiểu 8 tiếng (từ 22h đêm hôm trước), đến phòng khám trước 8h30 sáng.",
    packageId: "u2",
  },
  {
    id: "m7",
    weekFrom: 30,
    weekTo: 32,
    label: "30 – 32 tuần",
    title: "Mốc Vàng 3 · Siêu âm 5D Doppler & Ngôi thai",
    gold: true,
    ultrasound: "Siêu âm 5D Doppler động mạch rốn, động mạch não giữa, khảo sát dị tật muộn & vị trí bánh nhau",
    tests: ["Tổng phân tích nước tiểu", "Đo huyết áp tầm soát tiền sản giật cuối thai kỳ"],
    prepNote: "Giai đoạn mặt bé đầy đặn nhất để lưu video kỷ niệm 5D HDLive.",
    packageId: "u2",
  },
  {
    id: "m8",
    weekFrom: 35,
    weekTo: 40,
    label: "35 – 40 tuần",
    title: "Monitoring Tim thai & Hồ sơ đi sinh",
    ultrasound: "Siêu âm ước lượng cân nặng, ngôi thai, độ trưởng thành bánh nhau & chỉ số ối (AFI)",
    tests: [
      "Chạy máy Monitoring (CTG) theo dõi tim thai & cơn gò tử cung (30 phút)",
      "Xét nghiệm dịch âm đạo GBS (Liên cầu khuẩn nhóm B ở tuần 35–37)",
      "Bộ xét nghiệm máu – đông máu hoàn thiện hồ sơ sinh",
    ],
    prepNote: "Khám mỗi tuần 1 lần từ tuần 36. Mang theo toàn bộ sổ khám thai từ đầu thai kỳ.",
    packageId: "u5",
  },
];

export const packages: UltrasoundPackage[] = [
  {
    id: "u1",
    name: "Siêu âm 5D HDLive Hình Thái Học",
    tag: "5D HDLive",
    weeks: "18 – 32 tuần",
    duration: 30,
    price: 550000,
    salePrice: 450000,
    emoji: "👶",
    color: "#db2777",
    highlights: ["Khảo sát 40+ chỉ số hình thái thai nhi", "Tặng 6 ảnh màu 5D + gửi video HD qua Zalo", "Bác sĩ CKI Sản khoa trực tiếp siêu âm"],
    hot: true,
  },
  {
    id: "u2",
    name: "Siêu âm 5D + Doppler Tim Thai & Mạch Máu",
    tag: "Chuyên sâu",
    weeks: "24 – 36 tuần",
    duration: 35,
    price: 620000,
    salePrice: 520000,
    emoji: "💗",
    color: "#e11d48",
    highlights: ["Đánh giá tuần hoàn nhau thai – dây rốn", "Quay video chuyển động 5D sắc nét", "Tư vấn dinh dưỡng theo cân nặng bé"],
    hot: true,
  },
  {
    id: "u3",
    name: "Siêu âm 4D Mốc Vàng (12 / 22 / 32 tuần)",
    tag: "Mốc vàng",
    weeks: "12, 22, 32 tuần",
    duration: 25,
    price: 400000,
    salePrice: 350000,
    emoji: "🩺",
    color: "#0284c7",
    highlights: ["Đo độ mờ da gáy / chiều dài cổ tử cung", "Lưu trữ kết quả & biểu đồ tăng trưởng", "Gửi ảnh & kết quả điện tử qua Zalo"],
    hot: true,
  },
  {
    id: "u4",
    name: "Combo Siêu âm 5D + Sàng lọc trước sinh NIPT",
    tag: "Trọn gói",
    weeks: "Từ 9 tuần",
    duration: 40,
    price: 3200000,
    salePrice: 2650000,
    emoji: "🧬",
    color: "#7c3aed",
    highlights: ["Sàng lọc 23 cặp nhiễm sắc thể an toàn", "Miễn phí 2 lần siêu âm 5D HDLive", "Trả kết quả tận nơi & trên Zalo sau 5 ngày"],
  },
  {
    id: "u5",
    name: "Siêu âm 2D Thai Sớm & Tim Thai + Monitoring",
    tag: "Cơ bản",
    weeks: "5 – 40 tuần",
    duration: 20,
    price: 250000,
    emoji: "🍼",
    color: "#0d9488",
    highlights: ["Xác định túi thai, tim thai, ngày dự sinh", "Đo cơn gò & tim thai máy Monitoring"],
  },
];

export const doctors = [
  { id: "bs1", name: "BS.CKII Lê Thu Hà", title: "Nguyên Trưởng khoa Chẩn đoán hình ảnh", exp: "22 năm KN" },
  { id: "bs2", name: "ThS.BS Nguyễn Minh Anh", title: "Chuyên gia Siêu âm Hình thái học 5D", exp: "14 năm KN" },
  { id: "bs3", name: "BS.CKI Trần Bảo Ngọc", title: "Bác sĩ Sản Phụ khoa & Tiền sản", exp: "11 năm KN" },
];

export const babyPhotos = [
  { id: "ph1", title: "Bé mỉm cười – Tuần 22", date: "10/11/2026", weight: "480g", bpd: "54mm", hr: "146 l/p", color: "#db2777" },
  { id: "ph2", title: "Bé đưa tay che mặt – Tuần 18", date: "13/10/2026", weight: "240g", bpd: "42mm", hr: "150 l/p", color: "#0284c7" },
  { id: "ph3", title: "Đo độ mờ da gáy – Tuần 12", date: "01/09/2026", weight: "58g", bpd: "21mm", hr: "158 l/p", color: "#7c3aed" },
];

export const slots = makeSlots(8, 20, 30);
export const busySlots = ["09:00", "10:30", "14:30", "18:00"];

export const appointmentsAtom = createBookingStore([
  {
    id: "sa1",
    title: "Mốc 22w: Siêu âm 5D HDLive Hình Thái Học",
    subtitle: "BS.CKII Lê Thu Hà · Nhớ ăn nhẹ trước 30p",
    date: "22/11",
    time: "09:30",
    emoji: "👶",
    status: "upcoming",
  },
  {
    id: "sa2",
    title: "Mốc 26w: Xét nghiệm Tiểu đường thai kỳ",
    subtitle: "Lấy máu 3 lần · Nhịn ăn sáng từ 22h hôm trước",
    date: "18/12",
    time: "08:00",
    emoji: "🧪",
    status: "upcoming",
  },
]);

export function findPackage(id?: string): UltrasoundPackage | undefined {
  return packages.find((p) => p.id === id);
}

export function milestoneStatus(m: PregnancyMilestone, currentWeek: number): "done" | "active" | "upcoming" {
  if (currentWeek > m.weekTo) return "done";
  if (currentWeek >= m.weekFrom && currentWeek <= m.weekTo) return "active";
  return "upcoming";
}
