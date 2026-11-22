import { useNavigate } from "zmp-ui";

import { formatPrice, Tile, useTplTheme } from "../_shared/kit";
import { Blank, path } from "./data";

/**
 * Ảnh xem trước sản phẩm thêu: nền vải + vòng thêu + chữ (vẽ bằng CSS).
 * Màu chỉ, font, hoạ tiết thay đổi trực tiếp theo lựa chọn.
 */
export function EmbroideryPreview({
  fabric,
  text,
  thread,
  font,
  motif,
  emoji,
  className = "aspect-square w-full",
}: {
  className?: string;
  fabric: string;
  text: string;
  thread: string;
  font: string;
  motif?: string;
  emoji: string;
}) {
  const dark = isDark(fabric);
  return (
    <div className={`relative flex items-center justify-center overflow-hidden ${className}`} style={{ background: fabric }}>
      {/* Hoa văn vải */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{ backgroundImage: `repeating-linear-gradient(45deg, ${dark ? "#fff" : "#000"} 0 1px, transparent 1px 6px)` }}
      />
      <span className="absolute left-4 top-4 text-3xl opacity-60">{emoji}</span>
      {/* Vòng thêu */}
      <div
        className="relative flex aspect-square h-[82%] flex-col items-center justify-center rounded-full border-[10px]"
        style={{ borderColor: "#c8a27a", boxShadow: "inset 0 0 0 3px #a6845f, 0 8px 20px rgba(0,0,0,.15)" }}
      >
        {motif && <span className="text-3xl">{motif}</span>}
        <span
          className="max-w-[85%] break-words text-center leading-tight"
          style={{
            fontFamily: font,
            color: thread,
            fontSize: text.length > 14 ? 16 : text.length > 8 ? 20 : 26,
            fontWeight: 600,
            textShadow: `1px 1px 0 ${dark ? "#00000080" : "#ffffff90"}, 0 0 1px ${thread}`,
            letterSpacing: 0.5,
          }}
        >
          {text || "Tên của bạn"}
        </span>
      </div>
    </div>
  );
}

function isDark(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255,
    g = (n >> 8) & 255,
    b = n & 255;
  return r * 0.299 + g * 0.587 + b * 0.114 < 120;
}

export function BlankCard({ blank }: { blank: Blank }) {
  const navigate = useNavigate();
  const theme = useTplTheme();
  return (
    <button onClick={() => navigate(path(`/custom/${blank.id}`))} className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white text-left shadow-sm">
      <Tile seed={blank.id} emoji={blank.emoji} color={theme.primary} className="aspect-square w-full" rounded="" size="text-6xl" />
      <div className="p-3">
        <div className="text-sm font-semibold">{blank.name}</div>
        <div className="line-clamp-1 text-[11px] text-gray-500">{blank.note}</div>
        <div className="mt-1 text-sm">
          Từ{" "}
          <span className="font-bold" style={{ color: theme.primary }}>
            {formatPrice(blank.base)}
          </span>
        </div>
      </div>
    </button>
  );
}
