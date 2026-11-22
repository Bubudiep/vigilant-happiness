import { useAtomValue } from "jotai";
import { useNavigate } from "zmp-ui";

import { EmptyState, formatPrice, TplHeader, TplPage, useDemoAction, useTplTheme } from "../../_shared/kit";
import { orderSteps, ordersAtom, path } from "../data";

export default function OrdersPage() {
  const orders = useAtomValue(ordersAtom);
  const navigate = useNavigate();
  const demoAction = useDemoAction();
  const theme = useTplTheme();

  return (
    <TplPage tab>
      <TplHeader title="Đơn thêu của tôi" back={false} />
      {orders.length === 0 ? (
        <EmptyState emoji="🧵" text="Chưa có đơn thêu nào" action="Thiết kế ngay" onAction={() => navigate(path("/products"), { replace: true, direction: "backward" })} />
      ) : (
        <div className="space-y-3 px-4 pt-3">
          {orders.map((o) => (
            <div key={o.id} className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>#{o.id}</span>
                <span>{o.date}</span>
              </div>
              <div className="mt-2 flex gap-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gray-50 text-3xl">{o.emoji}</div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{o.blank}</div>
                  <div className="truncate text-sm">“{o.text}”</div>
                  <div className="truncate text-[11px] text-gray-500">{o.detail}</div>
                </div>
                <div className="text-sm font-bold" style={{ color: theme.primary }}>
                  {formatPrice(o.total)}
                </div>
              </div>

              {/* Tiến độ */}
              <div className="mt-4 flex items-start">
                {orderSteps.map((s, i) => {
                  const done = i <= o.step;
                  return (
                    <div key={s} className="flex flex-1 flex-col items-center text-center">
                      <div className="flex w-full items-center">
                        <div className="h-0.5 flex-1" style={{ background: i === 0 ? "transparent" : i <= o.step ? theme.primary : "#e5e7eb" }} />
                        <div
                          className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold"
                          style={done ? { background: theme.primary, color: "#fff" } : { background: "#f3f4f6", color: "#9ca3af" }}
                        >
                          {i < o.step ? "✓" : i + 1}
                        </div>
                        <div
                          className="h-0.5 flex-1"
                          style={{ background: i === orderSteps.length - 1 ? "transparent" : i < o.step ? theme.primary : "#e5e7eb" }}
                        />
                      </div>
                      <div className={`mt-1 text-[10px] ${i === o.step ? "font-semibold" : "text-gray-400"}`} style={i === o.step ? { color: theme.primary } : undefined}>
                        {s}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 flex gap-2">
                <button onClick={() => demoAction("Xem ảnh mẫu thêu")} className="flex-1 rounded-lg bg-gray-100 py-2 text-xs font-semibold">
                  📷 Ảnh mẫu
                </button>
                <button onClick={() => demoAction("Nhắn thợ thêu")} className="flex-1 rounded-lg bg-gray-100 py-2 text-xs font-semibold">
                  💬 Nhắn thợ thêu
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </TplPage>
  );
}
