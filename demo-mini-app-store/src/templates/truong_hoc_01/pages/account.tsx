import { useNavigate } from "zmp-ui";

import { AccountPage } from "../../_shared/kit";
import { path, student } from "../data";

export default function Account() {
  const navigate = useNavigate();
  return (
    <AccountPage
      referral={false}
      title="Phụ huynh"
      userName="Phụ huynh em Gia Bảo"
      userNote={`Lớp ${student.className} · ${student.code}`}
      card={{ label: "Kết quả học tập", tier: "Học kỳ I", value: "ĐTB 8.7 – Giỏi", progress: 0.87, note: "Xếp hạng 5/42 trong lớp" }}
      menu={[
        { emoji: "💳", label: "Học phí & thanh toán", onClick: () => navigate(path("/fees")) },
        { emoji: "📝", label: "Đơn xin nghỉ", onClick: () => navigate(path("/leave")) },
        { emoji: "👨‍👩‍👦", label: "Thêm học sinh khác" },
        { emoji: "🔔", label: "Cài đặt thông báo" },
        { emoji: "☎️", label: "Liên hệ văn phòng trường" },
      ]}
    />
  );
}
