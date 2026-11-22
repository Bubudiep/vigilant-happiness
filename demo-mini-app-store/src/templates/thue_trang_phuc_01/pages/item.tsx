import { useSetAtom } from "jotai";
import { useState } from "react";
import { useNavigate, useParams, useSnackbar } from "zmp-ui";

import {
  ActionBar,
  DayPicker,
  EmptyState,
  Field,
  formatPrice,
  nextDays,
  PrimaryButton,
  QtyStepper,
  Segmented,
  Tile,
  TplHeader,
  TplPage,
  useDemoAction,
  useTplTheme,
} from "../../_shared/kit";
import { findCostume, path, rentalsAtom } from "../data";

/** Cộng `n` ngày vào chuỗi dd/mm (năm hiện tại) */
function addDays(ddmm: string, n: number) {
  const [d, m] = ddmm.split("/").map(Number);
  const date = new Date(new Date().getFullYear(), m - 1, d + n);
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export default function ItemPage() {
  const { id } = useParams();
  const costume = findCostume(id);
  const navigate = useNavigate();
  const theme = useTplTheme();
  const demoAction = useDemoAction();
  const { openSnackbar } = useSnackbar();
  const setRentals = useSetAtom(rentalsAtom);

  const [size, setSize] = useState<string>();
  const [start, setStart] = useState(nextDays(14)[1].key);
  const [days, setDays] = useState(1);
  const [pickup, setPickup] = useState<"store" | "ship">("store");

  if (!costume) {
    return (
      <TplPage>
        <TplHeader title="Trang phục" />
        <EmptyState emoji="🤔" text="Không tìm thấy trang phục" />
      </TplPage>
    );
  }

  // Ưu đãi: thuê 3 ngày chỉ tính 2 (áo dài & cổ phục)
  const promo = (costume.type === "ao_dai" || costume.type === "co_phuc") && days >= 3;
  const chargedDays = promo ? days - Math.floor(days / 3) : days;
  const rent = costume.pricePerDay * chargedDays;
  const ship = pickup === "ship" ? 30000 : 0;
  const returnDate = addDays(start, days);

  const book = () => {
    if (!size) {
      openSnackbar({ text: "Vui lòng chọn size", type: "warning" });
      return;
    }
    setRentals((r) => [
      {
        id: `rt${Date.now()}`,
        title: `${costume.name} · Size ${size}`,
        subtitle: `Nhận ${start} → trả ${returnDate} · ${formatPrice(rent + ship)} + cọc ${formatPrice(costume.deposit)}`,
        date: start,
        emoji: costume.emoji,
        status: "upcoming",
      },
      ...r,
    ]);
    openSnackbar({ text: "Đã giữ đồ cho bạn! Tiệm sẽ nhắn xác nhận.", type: "success" });
    navigate(path("/rentals"), { replace: true });
  };

  return (
    <TplPage bottomSpace={68}>
      <TplHeader title={costume.name} />
      <Tile seed={costume.id} emoji={costume.emoji} color={costume.color} className="h-72 w-full" rounded="" size="text-[110px]" />

      <div className="bg-white p-4">
        <div className="text-xl font-bold">{costume.name}</div>
        <div className="mt-1 text-sm">
          <span className="text-lg font-bold" style={{ color: theme.primary }}>
            {formatPrice(costume.pricePerDay)}
          </span>
          <span className="text-gray-500">/ngày · Cọc {formatPrice(costume.deposit)}</span>
        </div>
        <div className="mt-2 text-xs text-gray-500">Trọn bộ gồm: {costume.includes.join(", ")}</div>
        <div className="mt-1 text-xs" style={{ color: costume.stock <= 2 ? "#dc2626" : "#16a34a" }}>
          Còn {costume.stock} bộ sẵn sàng
        </div>
      </div>

      <div className="mt-2 space-y-5 bg-white p-4">
        <Field label="Size">
          <div className="flex flex-wrap items-center gap-2">
            <Segmented options={costume.sizes.map((s) => ({ id: s, label: s }))} value={size ?? ""} onChange={setSize} />
            <button onClick={() => demoAction("Bảng size")} className="text-xs text-gray-500 underline">
              Bảng size
            </button>
          </div>
        </Field>
        <Field label="Ngày nhận đồ">
          <DayPicker value={start} onChange={setStart} days={nextDays(14)} />
        </Field>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-gray-700">Số ngày thuê</div>
            <div className="text-xs text-gray-500">Trả đồ ngày {returnDate}</div>
          </div>
          <QtyStepper value={days} min={1} onChange={setDays} />
        </div>
        <Field label="Nhận đồ">
          <Segmented
            options={[
              { id: "store", label: "Tại tiệm (thử đồ)" },
              { id: "ship", label: "Giao tận nơi +30K" },
            ]}
            value={pickup}
            onChange={setPickup}
          />
        </Field>
      </div>

      <div className="mx-4 mt-3 space-y-1.5 rounded-xl bg-white p-4 text-sm">
        <Row label={`Tiền thuê (${days} ngày)`} value={formatPrice(costume.pricePerDay * days)} />
        {promo && <Row label="Ưu đãi thuê 3 tính 2" value={`-${formatPrice(costume.pricePerDay * (days - chargedDays))}`} highlight />}
        {ship > 0 && <Row label="Giao nhận" value={formatPrice(ship)} />}
        <Row label="Tiền cọc (hoàn lại)" value={formatPrice(costume.deposit)} />
        <div className="border-t border-gray-100 pt-1.5">
          <Row label="Thanh toán khi nhận" value={formatPrice(rent + ship + costume.deposit)} bold />
        </div>
      </div>

      <ActionBar>
        <PrimaryButton outline onClick={() => demoAction("Đặt lịch thử đồ tại tiệm")}>
          Hẹn thử đồ
        </PrimaryButton>
        <PrimaryButton className="flex-1" onClick={book}>
          Thuê ngay · {formatPrice(rent + ship)}
        </PrimaryButton>
      </ActionBar>
    </TplPage>
  );
}

function Row({ label, value, bold, highlight }: { label: string; value: string; bold?: boolean; highlight?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-bold" : highlight ? "text-emerald-600" : "text-gray-600"}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
