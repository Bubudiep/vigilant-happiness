import { AccountPage } from "../../_shared/kit";
import { employee } from "../data";

export default function Account() {
  return (
    <AccountPage
      referral={false}
      title="Hồ sơ Nhân viên"
      userName={employee.name}
      userNote={`Mã NV: ${employee.code} · ${employee.dept}`}
      card={{
        label: "Phiếu lương & Phúc lợi Tháng 11",
        tier: "Chính thức",
        value: "22 công · 14.5h OT",
        progress: 0.85,
        note: "Kỳ chốt công: 25/11 · Ngày chi lương: 10/12",
      }}
      shortcutsTitle="Tiện ích nhà máy"
      shortcuts={[
        { emoji: "💵", label: "Phiếu lương" },
        { emoji: "🍱", label: "Cơm ca" },
        { emoji: "🚌", label: "Xe đưa đón" },
        { emoji: "🛡️", label: "An toàn LĐ" },
      ]}
      menu={[
        { emoji: "🪪", label: "Hồ sơ nhân sự & Hợp đồng lao động", note: "Đầy đủ" },
        { emoji: "🏥", label: "Mã số BHXH & Thẻ BHYT", note: "Đã đồng bộ" },
        { emoji: "🚌", label: "Tuyến xe đưa đón số 04 (Ngã tư Bình Phước)", note: "06:35" },
        { emoji: "📋", label: "Nội quy nhà máy & Sổ tay công đoàn" },
        { emoji: "☎️", label: "Đường dây nóng Phòng Nhân sự & Y tế" },
      ]}
    />
  );
}
