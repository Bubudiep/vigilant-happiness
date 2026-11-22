import { atom } from "jotai";

import { templatePath } from "../paths";

export const TEMPLATE_ID = "co_quan_01";
export const path = (sub = "") => templatePath(TEMPLATE_ID, sub);

/** Tên đơn vị giả lập cho bản demo */
export const AGENCY = "UBND Phường Hoà Bình";

export const newsTypes = [
  { id: "all", label: "Tất cả" },
  { id: "thong_bao", label: "Thông báo" },
  { id: "su_kien", label: "Sự kiện" },
  { id: "chinh_sach", label: "Chính sách" },
];

export const news = [
  { id: "t1", type: "thong_bao", emoji: "📢", title: "Lịch tiếp công dân tháng 12/2026", date: "17/11" },
  { id: "t2", type: "su_kien", emoji: "🧹", title: "Ra quân Ngày Chủ nhật xanh – làm sạch kênh rạch", date: "15/11" },
  { id: "t3", type: "chinh_sach", emoji: "📜", title: "Hướng dẫn đăng ký thường trú trực tuyến", date: "12/11" },
  { id: "t4", type: "thong_bao", emoji: "💉", title: "Tiêm vắc xin miễn phí cho trẻ dưới 5 tuổi", date: "10/11" },
  { id: "t5", type: "su_kien", emoji: "🎉", title: "Ngày hội Đại đoàn kết toàn dân tộc khu phố 3", date: "08/11" },
];

export interface Procedure {
  id: string;
  group: string;
  name: string;
  time: string;
  fee: string;
  documents: string[];
  steps: string[];
}

export const procedures: Procedure[] = [
  {
    id: "pc1",
    group: "Hộ tịch",
    name: "Đăng ký khai sinh",
    time: "Trong ngày",
    fee: "Miễn phí",
    documents: ["Tờ khai đăng ký khai sinh", "Giấy chứng sinh", "CCCD của cha/mẹ"],
    steps: ["Nộp hồ sơ trực tuyến hoặc tại bộ phận một cửa", "Cán bộ tiếp nhận, kiểm tra", "Nhận kết quả tại phường hoặc qua bưu điện"],
  },
  {
    id: "pc2",
    group: "Hộ tịch",
    name: "Đăng ký kết hôn",
    time: "03 ngày làm việc",
    fee: "Miễn phí",
    documents: ["Tờ khai đăng ký kết hôn", "CCCD hai bên", "Giấy xác nhận tình trạng hôn nhân (nếu khác nơi cư trú)"],
    steps: ["Hai bên nộp hồ sơ", "Kiểm tra, xác minh", "Hai bên có mặt ký và nhận Giấy chứng nhận"],
  },
  {
    id: "pc3",
    group: "Chứng thực",
    name: "Chứng thực bản sao từ bản chính",
    time: "Trong ngày",
    fee: "2.000đ/trang",
    documents: ["Bản chính giấy tờ", "Bản sao cần chứng thực"],
    steps: ["Xuất trình bản chính", "Cán bộ đối chiếu, ký chứng thực", "Nộp lệ phí, nhận kết quả"],
  },
  {
    id: "pc4",
    group: "Cư trú",
    name: "Đăng ký tạm trú",
    time: "03 ngày làm việc",
    fee: "Miễn phí khi nộp trực tuyến",
    documents: ["Tờ khai thay đổi thông tin cư trú", "Giấy tờ chứng minh chỗ ở hợp pháp"],
    steps: ["Nộp hồ sơ", "Công an phường kiểm tra", "Cập nhật Cơ sở dữ liệu cư trú, thông báo kết quả"],
  },
  {
    id: "pc5",
    group: "Đất đai – Xây dựng",
    name: "Xác nhận hiện trạng nhà ở",
    time: "05 ngày làm việc",
    fee: "Miễn phí",
    documents: ["Đơn đề nghị xác nhận", "Giấy tờ về nhà, đất"],
    steps: ["Nộp đơn", "Cán bộ địa chính kiểm tra thực địa", "Trả kết quả"],
  },
];

export const findProcedure = (id?: string) => procedures.find((p) => p.id === id);

export const feedbackTypes = [
  { id: "moi_truong", label: "Môi trường" },
  { id: "trat_tu", label: "Trật tự đô thị" },
  { id: "ha_tang", label: "Hạ tầng" },
  { id: "khac", label: "Khác" },
];

export interface Feedback {
  id: string;
  type: string;
  title: string;
  location: string;
  date: string;
  status: "Đã tiếp nhận" | "Đang xử lý" | "Đã xử lý";
}

export const feedbacksAtom = atom<Feedback[]>([
  { id: "f0", type: "ha_tang", title: "Đèn đường hẻm 45 bị hư", location: "Hẻm 45 Lê Văn Sỹ", date: "05/11", status: "Đã xử lý" },
]);
