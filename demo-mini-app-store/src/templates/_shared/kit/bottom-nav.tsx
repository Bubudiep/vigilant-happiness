import { ComponentProps, CSSProperties, ReactNode } from "react";
import { RiCustomerService2Fill } from "react-icons/ri";
import { BottomNavigation, Icon, useLocation, useNavigate } from "zmp-ui";

import { useDemoAction } from "../demo-action";
import { ZmpIcon } from "./icons";
import { useTplTheme } from "./theme";

export type IconName = ComponentProps<typeof Icon>["icon"];

export interface NavTab {
  key: string;
  label: string;
  icon: IconName;
  /** Đường dẫn đầy đủ, VD path("/menu") */
  to: string;
  /** Số hiển thị trên icon (giỏ hàng, lịch hẹn...) */
  badge?: number;
}

/**
 * Thanh tab dưới đáy của mẫu (sử dụng react-icons).
 * - Khi có 4 tab và `centerChat !== false`, hiển thị nút tròn nổi ở chính giữa để mở chat tư vấn nhanh.
 * - Tự ẩn ở trang con không phải tab.
 * - Chuyển tab có hiệu ứng trượt theo hướng: tab bên phải → forward, bên trái → backward.
 */
export default function TplBottomNav({
  tabs,
  centerChat = true,
  centerActionLabel = "Tư vấn trực tiếp qua Zalo",
}: {
  tabs: NavTab[];
  centerChat?: boolean;
  centerIcon?: IconName;
  centerActionLabel?: string;
}) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const theme = useTplTheme();
  const demoAction = useDemoAction();

  const currentIndex = tabs.findIndex(
    (t) => t.to === pathname.replace(/\/$/, ""),
  );
  if (currentIndex < 0) return null;

  const goTab = (nextIndex: number) => {
    if (nextIndex < 0 || nextIndex === currentIndex) return;
    navigate(tabs[nextIndex].to, {
      replace: true,
      direction: nextIndex > currentIndex ? "forward" : "backward",
    });
  };

  if (centerChat && tabs.length === 4) {
    const leftTabs = tabs.slice(0, 2);
    const rightTabs = tabs.slice(2, 4);

    return (
      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-gray-100 bg-white shadow-[0_-4px_16px_rgba(0,0,0,0.04)]"
        style={{
          paddingBottom: "var(--zaui-safe-area-inset-bottom, 0px)",
        }}
      >
        <div className="grid h-[60px] grid-cols-5 items-center px-1">
          {leftTabs.map((t, idx) => (
            <TabButton
              key={t.key}
              tab={t}
              active={currentIndex === idx}
              color={theme.primary}
              onClick={() => goTab(idx)}
            />
          ))}

          <div className="relative flex h-full items-center justify-center">
            <button
              type="button"
              onClick={() => demoAction(centerActionLabel)}
              aria-label="Tư vấn"
              className="absolute -top-3.5 flex h-14 w-14 items-center justify-center rounded-full border-4 border-white text-white shadow-lg transition-transform active:scale-95"
              style={{
                background: `linear-gradient(145deg, ${theme.primary}, ${theme.accent || theme.primary})`,
              }}
            >
              <RiCustomerService2Fill className="block h-6 w-6 shrink-0" />
            </button>
          </div>

          {rightTabs.map((t, idx) => {
            const realIndex = idx + 2;
            return (
              <TabButton
                key={t.key}
                tab={t}
                active={currentIndex === realIndex}
                color={theme.primary}
                onClick={() => goTab(realIndex)}
              />
            );
          })}
        </div>
      </nav>
    );
  }

  return (
    <BottomNavigation
      fixed
      className="tpl-bottom-nav"
      activeKey={tabs[currentIndex].key}
      onChange={(key) => {
        const nextIndex = tabs.findIndex((t) => t.key === key);
        goTab(nextIndex);
      }}
      style={
        {
          "--zaui-light-bottom-navigation-active-color": theme.primary,
        } as CSSProperties
      }
    >
      {tabs.map((t, idx) => (
        <BottomNavigation.Item
          key={t.key}
          itemKey={t.key}
          label={t.label}
          icon={
            <WithBadge count={t.badge}>
              <ZmpIcon name={t.icon} size={22} active={currentIndex === idx} className="block" />
            </WithBadge>
          }
        />
      ))}
    </BottomNavigation>
  );
}

function TabButton({
  tab,
  active,
  color,
  onClick,
}: {
  tab: NavTab;
  active: boolean;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-full flex-col items-center justify-center gap-1 py-1"
      style={{ color: active ? color : "#6b7280" }}
    >
      <WithBadge count={tab.badge}>
        <ZmpIcon name={tab.icon} size={22} active={active} className="block" />
      </WithBadge>
      <span className={`text-[11px] leading-none ${active ? "font-bold" : "font-normal"}`}>
        {tab.label}
      </span>
    </button>
  );
}

function WithBadge({
  count,
  children,
}: {
  count?: number;
  children: ReactNode;
}) {
  return (
    <span className="relative inline-flex items-center justify-center">
      {children}
      {!!count && count > 0 && (
        <span className="absolute -right-2.5 -top-1 min-w-[16px] rounded-full bg-[#e5484d] px-1 text-center text-[10px] font-bold leading-4 text-white">
          {count}
        </span>
      )}
    </span>
  );
}
