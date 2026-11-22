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
import { machineLabel as tableLabel, menu, menuCategories, MY_MACHINE as MY_TABLE, order, path } from "../data";

export default function MenuPage() {
  const navigate = useNavigate();
  const theme = useTplTheme();
  const [cat, setCat] = useState("all");
  const add = useAddToCart(order);
  const count = useAtomValue(order.countAtom);
  const total = useAtomValue(order.totalAtom);
  const list = menu.filter((m) => cat === "all" || m.category === cat);

  return (
    <TplPage tab bottomSpace={count ? 64 : 0}>
      <TplHeader title={`Gọi đồ tới ${tableLabel(MY_TABLE)}`} back={false}>
        <ChipRow items={menuCategories} value={cat} onChange={setCat} className="pb-2" />
      </TplHeader>

      <div className="grid grid-cols-2 gap-3 px-4 pt-3">
        {list.map((m) => (
          <div key={m.id} className="overflow-hidden rounded-xl bg-white shadow-sm">
            <Tile image="" seed={m.id} emoji={m.emoji} color={m.color} className="aspect-[4/3] w-full" rounded="" size="text-5xl" />
            <div className="p-2">
              <div className="truncate text-sm font-medium">{m.name}</div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-sm font-bold" style={{ color: theme.primary }}>
                  {formatPrice(m.price)}
                </span>
                <AddButton onClick={() => add({ id: m.id, name: m.name, emoji: m.emoji, color: m.color, unitPrice: m.price })} />
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
          <span className="text-sm">🧾 {count} món</span>
          <span className="font-semibold">{formatPrice(total)} · Xem ›</span>
        </button>
      )}
    </TplPage>
  );
}
