import { useAtomValue } from "jotai";
import { useState } from "react";
import { useNavigate } from "zmp-ui";

import {
  aboveSafeBottom,
  AddButton,
  ChipRow,
  formatPrice,
  NAV_HEIGHT,
  Tile,
  TplHeader,
  TplPage,
  useAddToCart,
  useTplTheme,
} from "../../_shared/kit";
import { dishCategories, dishes, order, path } from "../data";

export default function MenuPage() {
  const navigate = useNavigate();
  const theme = useTplTheme();
  const [cat, setCat] = useState("all");
  const add = useAddToCart(order);
  const count = useAtomValue(order.countAtom);
  const total = useAtomValue(order.totalAtom);

  const list = dishes.filter((d) => cat === "all" || d.category === cat);

  return (
    <TplPage tab bottomSpace={count ? 64 : 0}>
      <TplHeader title="Thực đơn" back={false}>
        <ChipRow items={dishCategories} value={cat} onChange={setCat} className="pb-2" />
      </TplHeader>

      <div className="mt-3 space-y-2 px-4">
        {list.map((d) => (
          <div key={d.id} className="flex gap-3 rounded-2xl bg-white p-3 shadow-sm">
            <Tile seed={d.id} emoji={d.emoji} color={d.color} className="h-20 w-20" />
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-center gap-1 text-sm font-semibold">
                {d.name}
                {d.signature && <span className="text-[10px] text-amber-600">★ Đặc sắc</span>}
              </div>
              <div className="text-xs text-gray-500">{d.description}</div>
              <div className="mt-auto flex items-center justify-between">
                <span className="text-sm font-bold" style={{ color: theme.primary }}>
                  {formatPrice(d.price)}
                </span>
                <AddButton onClick={() => add({ id: d.id, name: d.name, emoji: d.emoji, color: d.color, unitPrice: d.price })} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {count > 0 && (
        <button
          onClick={() => navigate(path("/order"))}
          className="fixed inset-x-4 z-40 flex items-center justify-between rounded-2xl px-4 py-3 text-white shadow-lg"
          style={{ bottom: aboveSafeBottom(NAV_HEIGHT + 8), background: theme.primary }}
        >
          <span className="text-sm">🧾 {count} món đã chọn</span>
          <span className="font-semibold">{formatPrice(total)} · Xem ›</span>
        </button>
      )}
    </TplPage>
  );
}
