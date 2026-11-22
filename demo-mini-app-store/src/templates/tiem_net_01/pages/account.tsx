import { useAtomValue } from "jotai";
import { useNavigate } from "zmp-ui";

import { AccountPage, formatPrice } from "../../_shared/kit";
import { path, walletAtom } from "../data";

export default function Account() {
  const navigate = useNavigate();
  const wallet = useAtomValue(walletAtom);
  const h = Math.floor(wallet.minutes / 60);
  const m = wallet.minutes % 60;
  return (
    <AccountPage
      userName="Gamer demo"
      referral={{ offer: "tặng 2 giờ chơi", reward: "Bạn nhận 2 giờ chơi khi bạn bè nạp lần đầu", code: "ZONE9" }}
      card={{
        label: "Ví Zone 9",
        tier: "Hạng Kim cương",
        value: `${formatPrice(wallet.balance)} · ${h}h${String(m).padStart(2, "0")}`,
        progress: 0.55,
        note: "Chơi thêm 18 giờ để lên hạng Cao thủ (giảm 10% giờ chơi)",
        background: "linear-gradient(135deg, #1e1b4b, #7c3aed)",
      }}
      shortcutsTitle="Tiện ích"
      shortcuts={[
        { emoji: "⚡", label: "Nạp ví", onClick: () => navigate(path("")) },
        { emoji: "🏆", label: "Giải đấu" },
        { emoji: "🎯", label: "Nhiệm vụ" },
        { emoji: "🎟️", label: "Voucher" },
      ]}
      menu={[
        { emoji: "🧾", label: "Lịch sử nạp & chơi" },
        { emoji: "🖥️", label: "Máy yêu thích" },
        { emoji: "👥", label: "Rủ bạn chơi", note: "+2 giờ" },
        { emoji: "💬", label: "Báo lỗi máy qua Zalo" },
      ]}
    />
  );
}
