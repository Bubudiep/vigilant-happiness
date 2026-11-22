import type { IconType } from "react-icons";
import {
  RiChat3Fill,
  RiChat3Line,
  RiCompass3Fill,
  RiCompass3Line,
  RiHome5Fill,
  RiPriceTag3Fill,
  RiPriceTag3Line,
  RiUser3Fill,
  RiUser3Line,
} from "react-icons/ri";
import { useAtom, useAtomValue } from "jotai";
import { useEffect } from "react";
import { useLocation, useNavigate } from "zmp-ui";

import { sessionAtom } from "@/utils/auth";
import { countWaitingTickets, fetchOverview, fetchUnreadMessages, pendingTicketsAtom, unreadMessagesAtom } from "@/utils/portal-api";

interface ShowcaseTab {
  key: string;
  label: string;
  path: string;
  icon: IconType;
  activeIcon: IconType;
  badge?: string;
}

const SHOWCASE_TABS: ShowcaseTab[] = [
  {
    key: "pricing",
    label: "Bảng giá",
    path: "/pricing",
    icon: RiPriceTag3Line,
    activeIcon: RiPriceTag3Fill,
    badge: "HOT",
  },
  {
    key: "process",
    label: "Quy trình",
    path: "/process",
    icon: RiCompass3Line,
    activeIcon: RiCompass3Fill,
  },
  {
    key: "home",
    label: "Trang chủ",
    path: "/",
    icon: RiHome5Fill,
    activeIcon: RiHome5Fill,
  },
  {
    key: "account",
    label: "Tài khoản",
    path: "/account",
    icon: RiUser3Line,
    activeIcon: RiUser3Fill,
  },
  {
    key: "contact",
    label: "Liên hệ",
    path: "/contact",
    icon: RiChat3Line,
    activeIcon: RiChat3Fill,
  },
];

/**
 * Thanh tab nổi 5 vị trí kiểu "Vựa Tốt":
 * - Khung trắng bo tròn nổi có rãnh lõm đồng tâm chính xác 100% với nút tròn ở giữa
 * - Trái: Bảng giá · Quy trình
 * - Giữa: Nút tròn xanh 3D (Trang chủ, không hiện chữ bên dưới)
 * - Phải: Tài khoản (dự án, ticket) · Liên hệ
 */
export default function ShowcaseNavigation() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const session = useAtomValue(sessionAtom);
  const [pendingTickets, setPending] = useAtom(pendingTicketsAtom);
  const [unreadMsgs, setUnreadMsgs] = useAtom(unreadMessagesAtom);
  const pending = pendingTickets + unreadMsgs;

  // Đã đăng nhập → lấy số ticket đang chờ khách trả lời để hiện chấm trên tab Tài khoản
  useEffect(() => {
    if (!session?.accessToken) {
      setPending(0);
      return;
    }
    let alive = true;
    fetchOverview()
      .then((o) => alive && setPending(countWaitingTickets(o.tickets)))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [session?.accessToken, setPending]);

  // Tin nhắn mới từ nhân viên: kiểm tra khi vào app và mỗi 60 giây (chỉ khi đã đăng nhập)
  useEffect(() => {
    if (!session?.accessToken) {
      setUnreadMsgs(0);
      return;
    }
    let alive = true;
    const check = () =>
      fetchUnreadMessages()
        .then((r) => alive && setUnreadMsgs(r.count))
        .catch(() => undefined);
    check();
    const t = setInterval(check, 60000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [session?.accessToken, setUnreadMsgs]);

  const cleanPath = pathname.replace(/\/$/, "") || "/";
  const currentIndex = SHOWCASE_TABS.findIndex((t) => t.path === cleanPath);

  if (currentIndex < 0) return null;

  const goTab = (nextIndex: number) => {
    if (nextIndex === currentIndex) {
      document.querySelector(".zaui-page")?.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    navigate(SHOWCASE_TABS[nextIndex].path, {
      replace: true,
      direction: nextIndex > currentIndex ? "forward" : "backward",
    });
  };

  const isHome = currentIndex === 2;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 px-3 pt-8"
      style={{
        paddingBottom: "calc(var(--zaui-safe-area-inset-bottom, 0px) + 8px)",
        background:
          "linear-gradient(180deg, rgba(244, 246, 251, 0) 0%, rgba(244, 246, 251, 0.55) 38%, rgba(244, 246, 251, 0.92) 72%, rgba(244, 246, 251, 0.98) 100%)",
      }}
    >
      <div className="pointer-events-auto relative mx-auto h-[66px] max-w-md">
        {/* Nền trắng 3 phần: 2 cánh co giãn + rãnh lõm 88x66 cố định ở giữa (không bị méo theo màn hình) */}
        <div className="pointer-events-none absolute inset-0 flex items-stretch drop-shadow-[0_8px_24px_rgba(15,23,42,0.12)]">
          <div className="-mr-[0.5px] flex-1 rounded-l-[26px] bg-white" />
          <svg
            width="88"
            height="66"
            viewBox="0 0 88 66"
            className="h-full w-[88px] shrink-0 block"
          >
            {/* Cung tròn R=32 tâm tại (44, 8) đồng tâm tuyệt đối với nút tròn r=26 tâm tại (44, 8) */}
            <path
              d="M 0 0 L 2 0 A 10 10 0 0 1 12 9.5 A 32 32 0 0 0 76 9.5 A 10 10 0 0 1 86 0 L 88 0 L 88 66 L 0 66 Z"
              fill="#ffffff"
            />
          </svg>
          <div className="-ml-[0.5px] flex-1 rounded-r-[26px] bg-white" />
        </div>

        {/* Nội dung 5 cột: 2 tab trái · cột giữa chứa nút tròn xanh · 2 tab phải */}
        <div className="relative z-10 grid h-full grid-cols-5 items-center px-1">
          {[0, 1].map((idx) => (
            <NavTabItem
              key={SHOWCASE_TABS[idx].key}
              tab={SHOWCASE_TABS[idx]}
              active={currentIndex === idx}
              onClick={() => goTab(idx)}
            />
          ))}

          {/* Cột 3 (chính giữa): Nút tròn xanh 3D tâm tại y = 8px (-top-[18px] với chiều cao 52px) */}
          <div className="relative flex h-full items-center justify-center">
            <button
              type="button"
              onClick={() => goTab(2)}
              aria-label="Trang chủ"
              className={`absolute -top-[18px] flex h-[52px] w-[52px] items-center justify-center rounded-full text-white transition-transform active:scale-95 ${
                isHome ? "ring-4 ring-blue-500/20" : "opacity-95"
              }`}
              style={{
                background: "linear-gradient(180deg, #4f9bff 0%, #1660ff 100%)",
                boxShadow:
                  "0 8px 20px rgba(22, 96, 255, 0.45), inset 0 2px 3px rgba(255, 255, 255, 0.45)",
              }}
            >
              <RiHome5Fill className="block h-6 w-6 shrink-0" />
            </button>
          </div>

          {[3, 4].map((idx) => (
            <NavTabItem
              key={SHOWCASE_TABS[idx].key}
              tab={SHOWCASE_TABS[idx]}
              active={currentIndex === idx}
              count={SHOWCASE_TABS[idx].key === "account" ? pending : 0}
              onClick={() => goTab(idx)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function NavTabItem({
  tab,
  active,
  count = 0,
  onClick,
}: {
  tab: ShowcaseTab;
  active: boolean;
  count?: number;
  onClick: () => void;
}) {
  const IconComp = active ? tab.activeIcon : tab.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-full flex-col items-center justify-center gap-1 py-1 active:scale-95"
    >
      <span className="relative inline-flex items-center justify-center">
        <IconComp
          className={`block h-[22px] w-[22px] shrink-0 ${
            active ? "text-[#1660ff]" : "text-gray-500"
          }`}
        />
        {count > 0 && (
          <span className="absolute -right-3 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold leading-none text-white ring-2 ring-white">
            {count > 9 ? "9+" : count}
          </span>
        )}
        {tab.badge && (
          <span className="absolute -right-5 -top-1.5 rounded-full bg-amber-400 px-1.5 py-[1px] text-[8px] font-black uppercase leading-tight text-gray-900 shadow-sm">
            {tab.badge}
          </span>
        )}
      </span>
      <span
        className={`text-[10.5px] leading-none ${
          active ? "font-extrabold text-[#1660ff]" : "font-medium text-gray-600"
        }`}
      >
        {tab.label}
      </span>
    </button>
  );
}
