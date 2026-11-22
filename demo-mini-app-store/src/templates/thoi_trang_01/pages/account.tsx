import { useAtomValue } from "jotai";
import { Icon } from "zmp-ui";

import { useDemoAction } from "@/templates/_shared/demo-action";

import ShopPage from "../components/shop-page";
import { BRAND, theme } from "../constants";
import { favoritesAtom } from "../state";

const orderStatuses = [
  { icon: "🧾", label: "Chờ xác nhận" },
  { icon: "📦", label: "Đang đóng gói" },
  { icon: "🚚", label: "Đang giao" },
  { icon: "⭐", label: "Đánh giá" },
];

export default function AccountPage() {
  const demoAction = useDemoAction();
  const favorites = useAtomValue(favoritesAtom);

  const menu = [
    { icon: "📍", label: "Sổ địa chỉ" },
    { icon: "🎟️", label: "Kho voucher", note: "3 mã" },
    { icon: "❤️", label: "Sản phẩm yêu thích", note: favorites.length ? `${favorites.length}` : undefined },
    { icon: "🏬", label: "Hệ thống cửa hàng" },
    { icon: "💬", label: "Hỗ trợ khách hàng" },
  ];

  return (
    <ShopPage tab="account">
      <div className="safe-top" style={{ background: `linear-gradient(160deg, ${theme.primary}, #4a4036)` }}>
        <div className="zalo-capsule-space flex h-12 items-center pl-4 text-base font-semibold text-white">
          Tài khoản
        </div>
        <div className="flex items-center gap-3 px-4 pb-16 pt-2 text-white">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 text-2xl">👤</div>
          <div>
            <div className="text-lg font-semibold">Khách hàng demo</div>
            <div className="text-xs opacity-80">Thành viên từ 2026</div>
          </div>
        </div>
      </div>

      {/* Thẻ thành viên */}
      <div className="-mt-12 px-4">
        <div
          className="rounded-2xl p-4 text-white shadow-lg"
          style={{ background: `linear-gradient(135deg, ${theme.accent}, #8a6a48)` }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-widest opacity-90">{BRAND} Member</span>
            <span className="rounded-full bg-white/25 px-2 py-0.5 text-xs font-semibold">Hạng Bạc</span>
          </div>
          <div className="mt-3 text-2xl font-bold">1.250 điểm</div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/30">
            <div className="h-full w-3/5 rounded-full bg-white" />
          </div>
          <div className="mt-1 text-xs opacity-90">Còn 750 điểm để lên hạng Vàng</div>
        </div>
      </div>

      {/* Đơn hàng */}
      <div className="mx-4 mt-4 rounded-xl bg-white p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold">Đơn hàng của tôi</span>
          <button onClick={() => demoAction("Lịch sử đơn hàng")} className="text-xs text-gray-500">
            Xem tất cả
          </button>
        </div>
        <div className="mt-3 grid grid-cols-4">
          {orderStatuses.map((s) => (
            <button
              key={s.label}
              onClick={() => demoAction(s.label)}
              className="flex flex-col items-center gap-1 text-[11px] text-gray-600"
            >
              <span className="text-2xl">{s.icon}</span>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Menu */}
      <div className="mx-4 mt-4 divide-y divide-gray-100 rounded-xl bg-white">
        {menu.map((m) => (
          <button
            key={m.label}
            onClick={() => demoAction(m.label)}
            className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm"
          >
            <span>{m.icon}</span>
            <span className="flex-1">{m.label}</span>
            {m.note && <span className="text-xs text-gray-400">{m.note}</span>}
            <Icon icon="zi-chevron-right" size={18} className="text-gray-300" />
          </button>
        ))}
      </div>
    </ShopPage>
  );
}
