import { useDemoAction } from "@/templates/_shared/demo-action";

import { LuChevronRight, RiUser3Fill, SmartIcon } from "./icons";
import { TplPage } from "./layout";
import { ReferralCard } from "./referral";
import { useTplTheme } from "./theme";

export interface AccountMenuItem {
  emoji: string;
  label: string;
  note?: string;
  onClick?: () => void;
}

/**
 * Trang "Tài khoản" dùng chung: hồ sơ, thẻ thành viên, lối tắt, menu (sử dụng react-icons).
 * Mọi mục không có onClick sẽ mở popup "Đây là bản demo".
 */
export function AccountPage({
  title = "Tài khoản",
  userName = "Khách hàng demo",
  userNote = "Thành viên từ 2026",
  card,
  shortcutsTitle,
  shortcuts = [],
  menu,
  referral,
}: {
  title?: string;
  userName?: string;
  userNote?: string;
  card?: {
    label: string;
    tier: string;
    value: string;
    progress: number;
    note: string;
    background?: string;
  };
  shortcutsTitle?: string;
  shortcuts?: AccountMenuItem[];
  menu: AccountMenuItem[];
  /** Module "Mời bạn bè" (chia sẻ). Mặc định bật; `false` để ẩn, hoặc truyền nội dung riêng. */
  referral?: false | { offer?: string; reward?: string; code?: string };
}) {
  const theme = useTplTheme();
  const demoAction = useDemoAction();
  const click = (m: AccountMenuItem) =>
    m.onClick ? m.onClick() : demoAction(m.label);

  return (
    <TplPage tab>
      <div
        className="safe-top"
        style={{
          background: `linear-gradient(160deg, ${theme.primary}, ${theme.primary}cc)`,
        }}
      >
        <div className="zalo-capsule-space flex h-12 items-center pl-4 text-base font-semibold text-white">
          {title}
        </div>
        <div
          className={`flex items-center gap-3 px-4 pt-2 text-white ${card ? "pb-16" : "pb-6"}`}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 text-white">
            <RiUser3Fill size={28} />
          </div>
          <div>
            <div className="text-lg font-semibold">{userName}</div>
            <div className="text-xs opacity-80">{userNote}</div>
          </div>
        </div>
      </div>

      {card && (
        <div className="-mt-12 px-4">
          <div
            className="rounded-2xl p-4 text-white shadow-lg"
            style={{
              background:
                card?.background ||
                `linear-gradient(135deg, ${theme.accent}, ${theme.accent}bb)`,
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-widest opacity-90">
                {card.label}
              </span>
              <span className="rounded-full bg-white/25 px-2 py-0.5 text-xs font-semibold">
                {card.tier}
              </span>
            </div>
            <div className="mt-3 text-2xl font-bold">{card.value}</div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/30">
              <div
                className="h-full rounded-full bg-white"
                style={{ width: `${Math.round(card.progress * 100)}%` }}
              />
            </div>
            <div className="mt-1 text-xs opacity-90">{card.note}</div>
          </div>
        </div>
      )}

      {shortcuts.length > 0 && (
        <div className="mx-4 mt-4 rounded-xl border border-gray-200/80 bg-white p-4 shadow-sm">
          {shortcutsTitle && (
            <div className="mb-3 text-sm font-semibold">{shortcutsTitle}</div>
          )}
          <div className="grid grid-cols-4 gap-2">
            {shortcuts.map((s) => (
              <button
                key={s.label}
                onClick={() => click(s)}
                className="flex flex-col items-center gap-1.5 text-[11px] text-gray-600"
              >
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ background: `${theme.primary}14`, color: theme.primary }}
                >
                  <SmartIcon token={s.emoji} size={20} />
                </span>
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {referral !== false && <ReferralCard {...(referral ?? {})} />}

      <div className="mx-4 mt-4 divide-y divide-gray-100 rounded-xl border border-gray-200/80 bg-white shadow-sm">
        {menu.map((m) => (
          <button
            key={m.label}
            onClick={() => click(m)}
            className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm"
          >
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
              style={{ background: `${theme.primary}12`, color: theme.primary }}
            >
              <SmartIcon token={m.emoji} size={17} />
            </span>
            <span className="flex-1">{m.label}</span>
            {m.note && <span className="text-xs text-gray-400">{m.note}</span>}
            <LuChevronRight size={18} className="text-gray-300" />
          </button>
        ))}
      </div>
    </TplPage>
  );
}
