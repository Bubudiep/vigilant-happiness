import { AccountPage } from "../../_shared/kit";

export default function Account() {
  return (
    <AccountPage
      referral={{ offer: "voucher siêu âm 5D 200K", reward: "Mẹ bầu được giới thiệu nhận ưu đãi gói khám đầu tiên", code: "BABY200" }}
      title="Sổ khám thai điện tử"
      userName="Mẹ bầu Nguyễn Lan Anh"
      userNote="Thai 22 tuần · Dự sinh 12/03/2027"
      card={{
        label: "Thẻ Thai Sản BabySee",
        tier: "Gói Mốc Vàng",
        value: "Đã khám 3/6 mốc",
        progress: 0.5,
        note: "Mốc tiếp theo: Tuần 26 (Nghiệm pháp tiểu đường thai kỳ)",
      }}
      shortcutsTitle="Tiện ích mẹ bầu"
      shortcuts={[
        { emoji: "👶", label: "Ảnh 5D" },
        { emoji: "🧾", label: "Kết quả XN" },
        { emoji: "📊", label: "Biểu đồ bé" },
        { emoji: "💊", label: "Lịch uống sắt" },
      ]}
      menu={[
        { emoji: "📋", label: "Hồ sơ thai kỳ & tiền sử", note: "Đã cập nhật" },
        { emoji: "🧬", label: "Kết quả sàng lọc NIPT", note: "Nguy cơ thấp" },
        { emoji: "🎟️", label: "Ưu đãi gói đi sinh", note: "2 voucher" },
        { emoji: "💬", label: "Chat Zalo với Nữ hộ sinh" },
        { emoji: "📍", label: "Chỉ đường tới phòng khám" },
      ]}
    />
  );
}
