import { atom } from "jotai";

import { templatePath } from "../paths";

export const TEMPLATE_ID = "kcn_doanh_nghiep_01";
export const path = (sub = "") => templatePath(TEMPLATE_ID, sub);

export const employee = {
  code: "VN-2048",
  name: "Nguyễn Văn Hùng",
  dept: "Xưởng Lắp ráp 2 · Chuyền A3",
  park: "KCN VSIP",
  shift: "Ca 1 (07:30 – 16:30)",
};

export interface AttendanceRecord {
  date: string;
  weekday: string;
  shift: string;
  checkIn: string;
  checkOut: string;
  otHours: number;
  status: "ok" | "missing" | "leave";
  note?: string;
}

export const checkedOutTodayAtom = atom<boolean>(false);

export const attendanceList: AttendanceRecord[] = [
  { date: "19/11", weekday: "T5", shift: "Ca 1", checkIn: "07:22", checkOut: "--:--", otHours: 0, status: "ok", note: "Đang làm việc" },
  { date: "18/11", weekday: "T4", shift: "Ca 1", checkIn: "07:25", checkOut: "18:30", otHours: 2, status: "ok" },
  { date: "17/11", weekday: "T3", shift: "Ca 1", checkIn: "07:28", checkOut: "--:--", otHours: 0, status: "missing", note: "Thiếu giờ ra" },
  { date: "16/11", weekday: "T2", shift: "Ca 1", checkIn: "07:20", checkOut: "19:00", otHours: 2.5, status: "ok" },
  { date: "15/11", weekday: "CN", shift: "Nghỉ", checkIn: "-", checkOut: "-", otHours: 0, status: "ok", note: "Nghỉ tuần" },
  { date: "14/11", weekday: "T7", shift: "Ca 1", checkIn: "07:24", checkOut: "16:32", otHours: 0, status: "ok" },
  { date: "13/11", weekday: "T6", shift: "Phép", checkIn: "-", checkOut: "-", otHours: 0, status: "leave", note: "Nghỉ phép năm" },
];

export interface SubmittedDoc {
  id: string;
  type: string;
  fileName: string;
  date: string;
  status: "approved" | "pending" | "rejected";
  note?: string;
}

export const submittedDocsAtom = atom<SubmittedDoc[]>([
  { id: "d1", type: "CCCD 2 mặt", fileName: "cccd_nguyenvanhung.jpg", date: "10/11/2026", status: "approved" },
  { id: "d2", type: "Giấy nghỉ ốm hưởng BHXH (C65-HD)", fileName: "giay_bhxh_1311.jpg", date: "14/11/2026", status: "pending", note: "Phòng Nhân sự đang kiểm tra" },
  { id: "d3", type: "Giấy khai sinh con (Giảm trừ gia cảnh)", fileName: "khaisinh_be.jpg", date: "02/11/2026", status: "approved" },
]);

export const docTypes = [
  "Giấy nghỉ ốm hưởng BHXH",
  "CCCD / Căn cước 2 mặt",
  "Giấy khám sức khoẻ định kỳ",
  "Giấy khai sinh con / Đăng ký kết hôn",
  "Bằng cấp / Chứng chỉ tay nghề",
  "Biên lai / Hoá đơn thanh toán",
];

export interface FormRequest {
  id: string;
  category: "leave" | "ot" | "explain" | "report";
  title: string;
  detail: string;
  date: string;
  status: "approved" | "pending";
}

export const formRequestsAtom = atom<FormRequest[]>([
  {
    id: "f1",
    category: "explain",
    title: "Giải trình quên chấm công ra (17/11)",
    detail: "Tan ca lúc 16:35 có xác nhận của Tổ trưởng",
    date: "18/11",
    status: "pending",
  },
  {
    id: "f2",
    category: "report",
    title: "Báo cáo 5S & Thiết bị: Đèn chiếu sáng chuyền A3 nhấp nháy",
    detail: "Khu vực bàn kiểm tra ngoại quan số 4, đã đính kèm 1 ảnh",
    date: "16/11",
    status: "approved",
  },
  {
    id: "f3",
    category: "leave",
    title: "Đơn xin nghỉ phép năm (13/11)",
    detail: "Giải quyết việc gia đình (1 ngày)",
    date: "11/11",
    status: "approved",
  },
]);

export interface QaItem {
  id: string;
  topic: string;
  question: string;
  answer?: string;
  date: string;
  anonymous?: boolean;
}

export const qaListAtom = atom<QaItem[]>([
  {
    id: "q1",
    topic: "Lương & Phụ cấp",
    question: "Tháng này tiền thưởng chuyên cần và phụ cấp xăng xe tính thế nào?",
    answer: "Phòng Nhân sự: Thưởng chuyên cần 500.000đ/tháng khi đủ công chuẩn và không đi trễ quá 15 phút. Phụ cấp xăng xe 300.000đ cộng thẳng vào kỳ lương ngày 10.",
    date: "15/11",
  },
  {
    id: "q2",
    topic: "BHXH & Phúc lợi",
    question: "Nộp giấy nghỉ ốm BHXH qua app thì có cần nộp lại bản giấy không?",
    answer: "Phòng Nhân sự: Bạn chụp ảnh rõ nét nộp trên Mini App để HR chốt công trước ngày 25, bản gốc gửi về thùng thư HR tại cổng xưởng trước ngày 30.",
    date: "12/11",
  },
  {
    id: "q3",
    topic: "Hòm thư góp ý",
    question: "Đề xuất bổ sung thêm quạt mát ở khu vực nhà ăn ca 1.",
    answer: "Ban Quản lý Nhà máy: Đã ghi nhận và lắp thêm 4 quạt công nghiệp tại dãy bàn B từ ngày 18/11.",
    date: "10/11",
    anonymous: true,
  },
]);
