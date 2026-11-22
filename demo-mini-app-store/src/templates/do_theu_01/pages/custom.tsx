import { useSetAtom } from "jotai";
import { useState } from "react";
import { useNavigate, useParams, useSnackbar } from "zmp-ui";

import {
  ActionBar,
  EmptyState,
  Field,
  formatPrice,
  PrimaryButton,
  QtyStepper,
  Segmented,
  TextArea,
  TextInput,
  TplHeader,
  TplPage,
  useDemoAction,
  useTplTheme,
} from "../../_shared/kit";
import { EmbroideryPreview } from "../components";
import { blanks, fonts, motifs, ordersAtom, path, PRICE_PER_CHAR, threadColors } from "../data";

export default function CustomPage() {
  const { id } = useParams();
  const blank = blanks.find((b) => b.id === id);
  const navigate = useNavigate();
  const theme = useTplTheme();
  const demoAction = useDemoAction();
  const { openSnackbar } = useSnackbar();
  const setOrders = useSetAtom(ordersAtom);

  const [fabric, setFabric] = useState(blank?.colors[0].hex ?? "#fff");
  const [text, setText] = useState("");
  const [thread, setThread] = useState(threadColors[0].hex);
  const [font, setFont] = useState(fonts[0].id);
  const [motif, setMotif] = useState("hoa");
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");

  if (!blank) {
    return (
      <TplPage>
        <TplHeader title="Thiết kế" />
        <EmptyState emoji="🤔" text="Không tìm thấy sản phẩm" />
      </TplPage>
    );
  }

  const m = motifs.find((x) => x.id === motif)!;
  const chars = text.replace(/\s/g, "").length;
  const unit = blank.base + chars * PRICE_PER_CHAR + m.price;
  const total = unit * qty;

  const order = () => {
    if (!text.trim()) {
      openSnackbar({ text: "Nhập chữ cần thêu nhé", type: "warning" });
      return;
    }
    const threadName = threadColors.find((t) => t.hex === thread)!.name;
    const fontName = fonts.find((f) => f.id === font)!.label;
    const d = new Date();
    setOrders((o) => [
      {
        id: `DT${1025 + o.length}`,
        blank: blank.name,
        emoji: blank.emoji,
        text,
        detail: `Chỉ ${threadName.toLowerCase()} · ${fontName}${m.emoji ? ` · ${m.label}` : ""} · SL ${qty}`,
        total,
        step: 0,
        date: `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`,
      },
      ...o,
    ]);
    openSnackbar({ text: "Đã gửi đơn! Tiệm sẽ gửi ảnh mẫu để bạn duyệt.", type: "success" });
    navigate(path("/orders"), { replace: true });
  };

  return (
    <TplPage bottomSpace={68}>
      <TplHeader title={blank.name} />

      <div className="sticky top-[calc(48px+var(--zaui-safe-area-inset-top,0px))] z-30">
        <EmbroideryPreview
          fabric={fabric}
          text={text}
          thread={thread}
          font={fonts.find((f) => f.id === font)!.css}
          motif={m.emoji}
          emoji={blank.emoji}
          className="h-[220px] w-full shadow-md"
        />
      </div>

      <div className="space-y-5 bg-white p-4">
        <Field label="Chữ cần thêu">
          <TextInput value={text} maxLength={24} onChange={(e) => setText(e.target.value)} placeholder="VD: Minh Anh, Love you, 2026..." />
          <div className="mt-1 flex justify-between text-[11px] text-gray-400">
            <span>+{formatPrice(PRICE_PER_CHAR)}/ký tự</span>
            <span>{text.length}/24</span>
          </div>
        </Field>

        <Field label={`Màu chỉ · ${threadColors.find((t) => t.hex === thread)!.name}`}>
          <div className="flex flex-wrap gap-3">
            {threadColors.map((t) => (
              <button
                key={t.hex}
                onClick={() => setThread(t.hex)}
                className="h-9 w-9 rounded-full border-2 p-0.5"
                style={{ borderColor: thread === t.hex ? theme.primary : "transparent" }}
              >
                <span className="block h-full w-full rounded-full border border-black/10" style={{ background: t.hex }} />
              </button>
            ))}
          </div>
        </Field>

        <Field label="Kiểu chữ">
          <Segmented options={fonts.map((f) => ({ id: f.id, label: f.label }))} value={font} onChange={setFont} />
        </Field>

        <Field label="Hoạ tiết kèm">
          <Segmented
            options={motifs.map((x) => ({ id: x.id, label: `${x.emoji} ${x.label}${x.price ? ` +${x.price / 1000}k` : ""}`.trim() }))}
            value={motif}
            onChange={setMotif}
          />
        </Field>

        {blank.colors.length > 1 && (
          <Field label="Màu vải">
            <Segmented options={blank.colors.map((c) => ({ id: c.hex, label: c.name }))} value={fabric} onChange={setFabric} />
          </Field>
        )}

        <button
          onClick={() => demoAction("Tải ảnh / logo để thêu")}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 py-3 text-sm text-gray-500"
        >
          🖼️ Tải ảnh / logo muốn thêu
        </button>

        <Field label="Ghi chú cho thợ thêu">
          <TextArea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="VD: thêu ngực trái, cao 3cm..." />
        </Field>

        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-gray-700">Số lượng</span>
          <QtyStepper value={qty} min={1} onChange={setQty} />
        </div>

        <div className="rounded-xl bg-gray-50 p-3 text-xs text-gray-600">
          Phôi {formatPrice(blank.base)} + {chars} ký tự × {formatPrice(PRICE_PER_CHAR)}
          {m.price ? ` + hoạ tiết ${formatPrice(m.price)}` : ""} = <b>{formatPrice(unit)}</b>/sp
        </div>
      </div>

      <ActionBar>
        <div className="flex-1">
          <div className="text-xs text-gray-500">Tạm tính</div>
          <div className="text-lg font-bold" style={{ color: theme.primary }}>
            {formatPrice(total)}
          </div>
        </div>
        <PrimaryButton onClick={order}>Đặt thêu</PrimaryButton>
      </ActionBar>
    </TplPage>
  );
}
