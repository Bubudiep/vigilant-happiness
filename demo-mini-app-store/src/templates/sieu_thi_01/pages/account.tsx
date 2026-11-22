import { AccountPage } from "../../_shared/kit";

export default function Account() {
  return (
    <AccountPage
      card={{ label: "Xanh Mart Member", tier: "Thành viên", value: "2.450 điểm", progress: 0.49, note: "Đổi 1.000 điểm = voucher 50K" }}
      shortcutsTitle="Đơn hàng"
      shortcuts={[
        { emoji: "🧾", label: "Chờ xác nhận" },
        { emoji: "📦", label: "Đang soạn" },
        { emoji: "🛵", label: "Đang giao" },
        { emoji: "🔁", label: "Mua lại" },
      ]}
      menu={[
        { emoji: "📍", label: "Sổ địa chỉ" },
        { emoji: "🎟️", label: "Voucher", note: "4 mã" },
        { emoji: "📝", label: "Danh sách đi chợ" },
        { emoji: "🏪", label: "Cửa hàng gần nhất" },
        { emoji: "💬", label: "Hỗ trợ" },
      ]}
    />
  );
}
