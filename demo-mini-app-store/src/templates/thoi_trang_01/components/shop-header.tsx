import { ReactNode } from "react";
import { Icon, useNavigate } from "zmp-ui";

/** Header tự vẽ (app ẩn action bar), chừa chỗ cho cụm nút của Zalo bên phải. */
export default function ShopHeader({
  title,
  back,
  right,
}: {
  title?: ReactNode;
  back?: boolean;
  right?: ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-40 bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)] safe-top">
      <div className="zalo-capsule-space flex h-12 items-center gap-2 pl-3">
        {back && (
          <button
            onClick={() => navigate(-1)}
            className="-ml-1 flex h-9 w-9 items-center justify-center rounded-full"
          >
            <Icon icon="zi-arrow-left" />
          </button>
        )}
        <div className="flex-1 truncate text-base font-semibold">{title}</div>
        {right}
      </div>
    </header>
  );
}
