import { Dropdown } from "antd";
import type { MenuProps } from "antd";
import { LuLogOut } from "react-icons/lu";
import type { AuthUser } from "../data/auth";

/** Nút tài khoản góc phải (dùng chung cho trang quản trị shop và trang điều hành). */
export default function UserMenu({
  user,
  onLogout,
  extraItems = [],
}: {
  user: AuthUser;
  onLogout: () => void;
  /** Mục thêm phía trên "Đăng xuất" (VD chuyển sang trang điều hành) */
  extraItems?: NonNullable<MenuProps["items"]>;
}) {
  return (
    <Dropdown
      trigger={["click"]}
      menu={{
        items: [
          {
            key: "info",
            disabled: true,
            label: (
              <div className="text-xs">
                <div className="font-bold text-slate-900">{user.name}</div>
                <div className="text-xs text-slate-500">
                  {user.provider === "zalo" ? "Tài khoản Zalo" : "Tài khoản Google"}
                  {user.phone ? ` · ${user.phone}` : user.email ? ` · ${user.email}` : ""}
                </div>
              </div>
            ),
          },
          { type: "divider" },
          ...extraItems,
          ...(extraItems.length ? [{ type: "divider" as const }] : []),
          { key: "logout", danger: true, icon: <LuLogOut size={14} />, label: "Đăng xuất", onClick: onLogout },
        ],
      }}
    >
      <button
        type="button"
        title={user.name}
        className="flex items-center rounded-full p-0.5 transition hover:ring-2 hover:ring-slate-200"
      >
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt={user.name} referrerPolicy="no-referrer" className="h-7 w-7 rounded-full object-cover" />
        ) : (
          <span
            className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold text-white"
            style={{ background: user.provider === "zalo" ? "#0068FF" : "#0C66E4" }}
          >
            {user.avatarText}
          </span>
        )}
      </button>
    </Dropdown>
  );
}
