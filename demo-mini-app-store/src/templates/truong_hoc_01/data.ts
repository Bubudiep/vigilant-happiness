import { atom } from "jotai";

import { templatePath } from "../paths";

export const TEMPLATE_ID = "truong_hoc_01";
export const path = (sub = "") => templatePath(TEMPLATE_ID, sub);

export const student = { name: "Nguyễn Gia Bảo", className: "7A2", teacher: "Cô Trần Thị Hạnh", code: "HS2026-0712" };

export interface Notice {
  id: string;
  type: "school" | "class" | "fee";
  title: string;
  body: string;
  date: string;
}

export const noticeTypes = [
  { id: "all", label: "Tất cả" },
  { id: "school", label: "Nhà trường" },
  { id: "class", label: "Lớp 7A2" },
  { id: "fee", label: "Học phí" },
];

export const notices: Notice[] = [
  { id: "n1", type: "school", title: "Lịch thi giữa học kỳ I", body: "Học sinh thi từ 24/11 đến 28/11. Phụ huynh nhắc các con ôn tập và đến trường trước 7:00.", date: "17/11" },
  { id: "n2", type: "fee", title: "Thông báo học phí tháng 12", body: "Hạn đóng học phí và tiền ăn bán trú tháng 12 là 05/12. Phụ huynh có thể thanh toán ngay trên ứng dụng.", date: "16/11" },
  { id: "n3", type: "class", title: "Họp phụ huynh lớp 7A2", body: "Buổi họp diễn ra lúc 8:00 Chủ nhật 23/11 tại phòng 204.", date: "15/11" },
  { id: "n4", type: "school", title: "Ngày hội Nhà giáo Việt Nam 20/11", body: "Nhà trường tổ chức văn nghệ chào mừng. Học sinh mặc đồng phục.", date: "12/11" },
  { id: "n5", type: "class", title: "Nhận xét tuần 10", body: "Bé Bảo tích cực phát biểu, cần chú ý hoàn thành bài tập môn Anh.", date: "10/11" },
];

export const readNoticesAtom = atom<string[]>(["n4", "n5"]);

export const weekdays = [
  { id: "2", label: "Thứ 2" },
  { id: "3", label: "Thứ 3" },
  { id: "4", label: "Thứ 4" },
  { id: "5", label: "Thứ 5" },
  { id: "6", label: "Thứ 6" },
];

const S = (subject: string, teacher: string, emoji: string) => ({ subject, teacher, emoji });
export const timetable: Record<string, { subject: string; teacher: string; emoji: string }[]> = {
  "2": [S("Chào cờ", "", "🇻🇳"), S("Toán", "Thầy Minh", "📐"), S("Ngữ văn", "Cô Hạnh", "📖"), S("Tiếng Anh", "Cô Linh", "🔤"), S("Thể dục", "Thầy Tùng", "⚽")],
  "3": [S("Vật lý", "Thầy Khoa", "🔭"), S("Toán", "Thầy Minh", "📐"), S("Lịch sử", "Cô Mai", "🏛️"), S("Tin học", "Thầy Phúc", "💻"), S("Mỹ thuật", "Cô Thảo", "🎨")],
  "4": [S("Ngữ văn", "Cô Hạnh", "📖"), S("Ngữ văn", "Cô Hạnh", "📖"), S("Sinh học", "Cô Ngọc", "🧬"), S("Tiếng Anh", "Cô Linh", "🔤"), S("Âm nhạc", "Cô Vy", "🎵")],
  "5": [S("Toán", "Thầy Minh", "📐"), S("Địa lý", "Thầy Sơn", "🌏"), S("GDCD", "Cô Mai", "⚖️"), S("Tiếng Anh", "Cô Linh", "🔤"), S("Công nghệ", "Thầy Khoa", "🛠️")],
  "6": [S("Vật lý", "Thầy Khoa", "🔭"), S("Toán", "Thầy Minh", "📐"), S("Ngữ văn", "Cô Hạnh", "📖"), S("Thể dục", "Thầy Tùng", "⚽"), S("Sinh hoạt lớp", "Cô Hạnh", "🗣️")],
};
export const periodTimes = ["07:00", "07:50", "08:50", "09:40", "10:30"];

export const fees = [
  { name: "Học phí tháng 12", amount: 650000, paid: false },
  { name: "Tiền ăn bán trú tháng 12", amount: 600000, paid: false },
  { name: "Học phí tháng 11", amount: 650000, paid: true },
  { name: "Tiền ăn bán trú tháng 11", amount: 600000, paid: true },
  { name: "Bảo hiểm y tế năm học", amount: 884000, paid: true },
];
