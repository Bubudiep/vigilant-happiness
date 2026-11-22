import { useState } from "react";
import { useNavigate, useParams } from "zmp-ui";

import {
  ActionBar,
  EmptyState,
  formatPrice,
  PrimaryButton,
  QtyStepper,
  Segmented,
  TextArea,
  Tile,
  TplHeader,
  TplPage,
  useAddToCart,
  useTplTheme,
} from "../../_shared/kit";
import { cart, findDrink, iceLevels, sizes, sugarLevels, toppings } from "../data";

export default function ItemPage() {
  const { id } = useParams();
  const drink = findDrink(id);
  const navigate = useNavigate();
  const theme = useTplTheme();
  const addToCart = useAddToCart(cart);

  const [size, setSize] = useState("M");
  const [sugar, setSugar] = useState("70%");
  const [ice, setIce] = useState("Bình thường");
  const [tops, setTops] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [qty, setQty] = useState(1);

  if (!drink) {
    return (
      <TplPage>
        <TplHeader title="Món" />
        <EmptyState emoji="🤔" text="Không tìm thấy món" />
      </TplPage>
    );
  }

  const sizeExtra = drink.customizable ? sizes.find((s) => s.id === size)!.extra : 0;
  const topExtra = toppings.filter((t) => tops.includes(t.id)).reduce((s, t) => s + t.price, 0);
  const unitPrice = drink.price + sizeExtra + topExtra;

  const add = () => {
    const parts = drink.customizable
      ? [`Size ${size}`, `Đường ${sugar}`, ice, ...toppings.filter((t) => tops.includes(t.id)).map((t) => t.label)]
      : [];
    if (note) parts.push(`"${note}"`);
    addToCart({
      key: `${drink.id}|${parts.join("|")}`,
      id: drink.id,
      name: drink.name,
      emoji: drink.emoji,
      color: drink.color,
      unitPrice,
      qty,
      options: parts.join(" · "),
    });
    navigate(-1);
  };

  return (
    <TplPage bottomSpace={68}>
      <TplHeader title={drink.name} />
      <Tile seed={drink.id} emoji={drink.emoji} color={drink.color} className="aspect-[4/3] w-full" rounded="" size="text-[110px]" />

      <div className="bg-white px-4 py-4">
        <div className="text-xl font-bold">{drink.name}</div>
        <div className="mt-1 text-sm text-gray-500">{drink.description}</div>
        <div className="mt-2 text-lg font-bold" style={{ color: theme.primary }}>
          {formatPrice(drink.price)}
        </div>
      </div>

      {drink.customizable && (
        <div className="mt-2 space-y-5 bg-white p-4">
          <Group title="Chọn size">
            <Segmented
              options={sizes.map((s) => ({ id: s.id, label: `${s.label}${s.extra ? ` +${s.extra / 1000}k` : ""}` }))}
              value={size}
              onChange={setSize}
            />
          </Group>
          <Group title="Lượng đường">
            <Segmented options={sugarLevels.map((s) => ({ id: s, label: s }))} value={sugar} onChange={setSugar} />
          </Group>
          <Group title="Lượng đá">
            <Segmented options={iceLevels.map((s) => ({ id: s, label: s }))} value={ice} onChange={setIce} />
          </Group>
          <Group title="Topping">
            <div className="space-y-2">
              {toppings.map((t) => {
                const on = tops.includes(t.id);
                return (
                  <button
                    key={t.id}
                    onClick={() => setTops((x) => (on ? x.filter((i) => i !== t.id) : [...x, t.id]))}
                    className="flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-sm"
                    style={{ borderColor: on ? theme.primary : "#e5e7eb" }}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className="flex h-5 w-5 items-center justify-center rounded border text-xs text-white"
                        style={on ? { background: theme.primary, borderColor: theme.primary } : { borderColor: "#d1d5db" }}
                      >
                        {on ? "✓" : ""}
                      </span>
                      {t.label}
                    </span>
                    <span className="text-gray-500">+{formatPrice(t.price)}</span>
                  </button>
                );
              })}
            </div>
          </Group>
        </div>
      )}

      <div className="mt-2 bg-white p-4">
        <Group title="Ghi chú cho cửa hàng">
          <TextArea rows={2} placeholder="VD: ít ngọt, mang thêm ống hút..." value={note} onChange={(e) => setNote(e.target.value)} />
        </Group>
      </div>

      <ActionBar>
        <QtyStepper value={qty} min={1} onChange={setQty} />
        <PrimaryButton onClick={add} className="flex-1">
          Thêm vào đơn · {formatPrice(unitPrice * qty)}
        </PrimaryButton>
      </ActionBar>
    </TplPage>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-sm font-semibold">{title}</div>
      {children}
    </div>
  );
}
