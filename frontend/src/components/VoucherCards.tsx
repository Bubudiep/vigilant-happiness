import {
  App as AntApp,
  Button,
  Checkbox,
  ColorPicker,
  Drawer,
  Empty,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Segmented,
  Select,
  Spin,
  Table,
  Tag,
} from "antd";
import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { LuDownload, LuPrinter, LuRefreshCw, LuSparkles, LuTicket, LuTrash2 } from "react-icons/lu";
import { ApiError } from "../data/platform-api";
import {
  deleteVoucherCodes,
  fetchVoucherCodes,
  generateVoucherCodes,
  StoreConfig,
  StoreVoucherItem,
  VoucherCodeItem,
} from "../data/store-api";

const errMsg = (e: unknown, fallback: string) => (e instanceof ApiError ? e.message : fallback);

// ───────────────────────── Nội dung thẻ ─────────────────────────

/** 50000 → 50K, 1500000 → 1,5TR */
const short = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}TR` : n >= 1000 ? `${Math.round(n / 1000)}K` : `${n}đ`;

export function offerText(v: StoreVoucherItem) {
  return v.discountType === "percent" ? `GIẢM ${v.discountValue}%` : v.discountType === "freeship" ? "FREESHIP" : `GIẢM ${short(v.discountValue)}`;
}

function offerSub(v: StoreVoucherItem) {
  if (v.discountType === "freeship") return `Miễn phí ship tối đa ${short(v.discountValue)}`;
  if (v.discountType === "percent" && v.maxDiscount) return `Tối đa ${short(v.maxDiscount)}`;
  return "";
}

function conditionText(v: StoreVoucherItem, tierName?: string) {
  const parts: string[] = [];
  if (v.minOrderValue > 0) parts.push(`Cho đơn từ ${short(v.minOrderValue)}`);
  if (tierName) parts.push(`Hạng ${tierName}`);
  return parts.join(" · ");
}

// ───────────────────────── Mẫu & kích thước ─────────────────────────

export type TemplateId = "modern" | "minimal" | "ticket" | "luxury" | "pastel";
export const TEMPLATES: { id: TemplateId; name: string; desc: string }[] = [
  { id: "modern", name: "Hiện đại", desc: "Nền chuyển màu, chữ trắng" },
  { id: "minimal", name: "Tối giản", desc: "Nền trắng, sọc màu thương hiệu" },
  { id: "ticket", name: "Vé xé", desc: "Cuống vé chứa mã & QR" },
  { id: "luxury", name: "Sang trọng", desc: "Nền đen, chữ vàng" },
  { id: "pastel", name: "Dễ thương", desc: "Nền pastel chấm bi" },
];

export const SIZES: { id: string; name: string; w: number; h: number }[] = [
  { id: "cr80", name: "Thẻ nhựa / ATM", w: 85.6, h: 54 },
  { id: "namecard", name: "Danh thiếp", w: 90, h: 55 },
  { id: "slim", name: "Danh thiếp mỏng", w: 90, h: 50 },
  { id: "ticket", name: "Vé dài", w: 150, h: 60 },
  { id: "dl", name: "Phiếu 1/3 A4", w: 210, h: 99 },
  { id: "a6", name: "A6 ngang", w: 148, h: 105 },
  { id: "custom", name: "Tuỳ chỉnh", w: 100, h: 60 },
];

const PAPERS: { id: string; name: string; w: number; h: number }[] = [
  { id: "a4", name: "A4 (210 × 297)", w: 210, h: 297 },
  { id: "a3", name: "A3 (297 × 420)", w: 297, h: 420 },
  { id: "card", name: "Theo khổ thẻ (máy in thẻ — 1 thẻ / trang)", w: 0, h: 0 },
];

export interface CardOptions {
  template: TemplateId;
  sizeId: string;
  w: number;
  h: number;
  paper: string;
  margin: number;
  gap: number;
  cutMarks: boolean;
  rounded: boolean;
  primary: string;
  accent: string;
  showQr: boolean;
  showExpiry: boolean;
  showCondition: boolean;
  headline: string;
  note: string;
}

interface CardData {
  storeName: string;
  headline: string;
  offer: string;
  offerSub: string;
  condition: string;
  expiry: string;
  code: string;
  note: string;
}

const FONT = "'Be Vietnam Pro','Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const MONO = "'JetBrains Mono',Consolas,'Courier New',monospace";
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Trộn màu hex với trắng (t = 0…1) */
function tint(hex: string, t: number) {
  const m = hex.replace("#", "").match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i);
  if (!m) return "#f1f5f9";
  const c = m.slice(1).map((x) => Math.round(parseInt(x, 16) + (255 - parseInt(x, 16)) * t));
  return `rgb(${c.join(",")})`;
}

/**
 * HTML của một thẻ (style nội tuyến, đơn vị mm) — dùng chung cho xem trước và bản in.
 * Cỡ chữ co giãn theo kích thước thẻ (u = 1 với thẻ 86 × 54 mm).
 */
export function renderCard(o: CardOptions, d: CardData, qrSvg: string | null): string {
  const { w, h } = o;
  const u = Math.min(h / 54, w / 86);
  const mm = (n: number) => `${(n * u).toFixed(2)}mm`;
  const radius = o.rounded ? mm(3) : "0";
  const qrSize = Math.min(h * 0.42, w * 0.3);
  const qr = (bg: string, pad = 1.2) =>
    o.showQr && qrSvg
      ? `<div style="width:${qrSize}mm;height:${qrSize}mm;padding:${mm(pad)};background:${bg};border-radius:${mm(1.6)};box-sizing:border-box;flex-shrink:0">${qrSvg}</div>`
      : "";
  const expiry = o.showExpiry && d.expiry ? d.expiry : "";
  const cond = o.showCondition ? [d.offerSub, d.condition].filter(Boolean).join(" · ") : "";
  const base = `width:${w}mm;height:${h}mm;position:relative;overflow:hidden;box-sizing:border-box;border-radius:${radius};font-family:${FONT};line-height:1.15;`;
  const line = (txt: string, style: string) => (txt ? `<div style="${style}">${esc(txt)}</div>` : "");

  switch (o.template) {
    case "minimal":
      return `<div style="${base}background:#fff;border:0.3mm solid #e2e8f0;color:#0f172a;display:flex">
        <div style="width:${mm(3)};background:${o.primary};flex-shrink:0"></div>
        <div style="flex:1;display:flex;gap:${mm(3)};padding:${mm(4.5)} ${mm(5)};min-width:0">
          <div style="flex:1;min-width:0;display:flex;flex-direction:column;justify-content:space-between">
            <div>
              ${line(d.storeName, `font-size:${mm(2.4)};font-weight:700;letter-spacing:${mm(0.25)};text-transform:uppercase;color:#64748b`)}
              ${line(d.offer, `font-size:${mm(8.5)};font-weight:900;color:${o.primary};margin-top:${mm(1.2)};white-space:nowrap`)}
              ${line(d.headline, `font-size:${mm(2.8)};font-weight:600;margin-top:${mm(0.8)};overflow:hidden;max-height:${mm(6.6)}`)}
              ${line(cond, `font-size:${mm(2.2)};color:#64748b;margin-top:${mm(0.8)}`)}
              ${line(d.note, `font-size:${mm(1.9)};color:#94a3b8;margin-top:${mm(0.5)}`)}
            </div>
            <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:${mm(2)}">
              <div style="border:0.3mm dashed ${o.primary};border-radius:${mm(1.4)};padding:${mm(0.9)} ${mm(2)};font-family:${MONO};font-size:${mm(3.4)};font-weight:800;letter-spacing:${mm(0.35)};color:#0f172a;white-space:nowrap">${esc(d.code)}</div>
              ${line(expiry, `font-size:${mm(2.1)};color:#94a3b8;white-space:nowrap`)}
            </div>
          </div>
          ${o.showQr && qrSvg ? `<div style="display:flex;align-items:center">${qr("#fff", 0)}</div>` : ""}
        </div>
      </div>`;

    case "ticket": {
      const stubW = Math.max(h * 0.62, qrSize + 8 * u);
      const notch = 5 * u;
      return `<div style="${base}display:flex;background:#fff;border:0.3mm solid ${tint(o.primary, 0.6)};color:#0f172a">
        <div style="flex:1;min-width:0;background:linear-gradient(135deg,${o.primary},${o.accent});color:#fff;padding:${mm(4.5)} ${mm(5)};display:flex;flex-direction:column;justify-content:space-between">
          <div>
            ${line(d.storeName, `font-size:${mm(2.4)};font-weight:700;letter-spacing:${mm(0.25)};text-transform:uppercase;opacity:.85`)}
            ${line(d.offer, `font-size:${mm(8.5)};font-weight:900;margin-top:${mm(1.2)};white-space:nowrap`)}
            ${line(d.headline, `font-size:${mm(2.8)};font-weight:600;margin-top:${mm(0.8)};overflow:hidden;max-height:${mm(6.6)}`)}
          </div>
          <div>
            ${line(cond, `font-size:${mm(2.1)};opacity:.9`)}
            ${line(d.note, `font-size:${mm(1.9)};opacity:.75;margin-top:${mm(0.6)}`)}
          </div>
        </div>
        <div style="position:relative;width:${stubW}mm;flex-shrink:0;border-left:0.4mm dashed ${tint(o.primary, 0.35)};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${mm(1.4)};padding:${mm(3)} ${mm(2)}">
          <div style="position:absolute;left:-${notch / 2}mm;top:-${notch / 2}mm;width:${notch}mm;height:${notch}mm;border-radius:50%;background:#fff;border:0.3mm solid ${tint(o.primary, 0.6)}"></div>
          <div style="position:absolute;left:-${notch / 2}mm;bottom:-${notch / 2}mm;width:${notch}mm;height:${notch}mm;border-radius:50%;background:#fff;border:0.3mm solid ${tint(o.primary, 0.6)}"></div>
          <div style="font-size:${mm(1.9)};font-weight:700;letter-spacing:${mm(0.3)};color:#94a3b8">MÃ VOUCHER</div>
          ${qr("#fff", 0)}
          <div style="font-family:${MONO};font-size:${mm(3)};font-weight:800;letter-spacing:${mm(0.25)};color:${o.primary};white-space:nowrap">${esc(d.code)}</div>
          ${line(expiry, `font-size:${mm(1.9)};color:#94a3b8;white-space:nowrap`)}
        </div>
      </div>`;
    }

    case "luxury": {
      const gold = "#d4af37";
      return `<div style="${base}background:radial-gradient(circle at 20% 0%,#2a2a2e,#0b0b0c 70%);color:${gold};display:flex;gap:${mm(3)};padding:${mm(5.5)} ${mm(6)}">
        <div style="position:absolute;inset:${mm(2.2)};border:0.3mm solid ${gold};opacity:.55;border-radius:${o.rounded ? mm(2) : "0"}"></div>
        <div style="flex:1;min-width:0;display:flex;flex-direction:column;justify-content:space-between;position:relative">
          <div>
            ${line(d.storeName, `font-size:${mm(2.3)};letter-spacing:${mm(0.6)};text-transform:uppercase;color:#e9d9a6`)}
            ${line(d.offer, `font-family:Georgia,'Times New Roman',serif;font-size:${mm(8.5)};font-weight:700;margin-top:${mm(1.4)};white-space:nowrap`)}
            ${line(d.headline, `font-size:${mm(2.7)};color:#f3e7c3;margin-top:${mm(0.8)};overflow:hidden;max-height:${mm(6.4)}`)}
            ${line(cond, `font-size:${mm(2.1)};color:#bfae7a;margin-top:${mm(0.8)}`)}
            ${line(d.note, `font-size:${mm(1.9)};color:#8f8257;margin-top:${mm(0.5)}`)}
          </div>
          <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:${mm(2)}">
            <div style="font-family:${MONO};font-size:${mm(3.4)};font-weight:700;letter-spacing:${mm(0.5)};white-space:nowrap">${esc(d.code)}</div>
            ${line(expiry, `font-size:${mm(2)};color:#bfae7a;white-space:nowrap`)}
          </div>
        </div>
        ${o.showQr && qrSvg ? `<div style="display:flex;align-items:center;position:relative">${qr("#f5e9c6")}</div>` : ""}
      </div>`;
    }

    case "pastel":
      return `<div style="${base}background-color:${tint(o.primary, 0.86)};background-image:radial-gradient(${tint(o.primary, 0.7)} ${mm(0.55)},transparent ${mm(0.65)});background-size:${mm(4)} ${mm(4)};color:#0f172a;display:flex;gap:${mm(3)};padding:${mm(4.5)} ${mm(5)}">
        <div style="flex:1;min-width:0;display:flex;flex-direction:column;justify-content:space-between">
          <div>
            ${line(d.storeName, `display:inline-block;font-size:${mm(2.3)};font-weight:800;color:#fff;background:${o.primary};border-radius:${mm(5)};padding:${mm(0.6)} ${mm(2.2)}`)}
            ${line(d.offer, `font-size:${mm(8.5)};font-weight:900;color:${o.primary};margin-top:${mm(1.3)};white-space:nowrap`)}
            ${line(d.headline, `font-size:${mm(2.8)};font-weight:700;margin-top:${mm(0.6)};overflow:hidden;max-height:${mm(6.6)}`)}
            ${line(cond, `font-size:${mm(2.1)};color:#475569;margin-top:${mm(0.6)}`)}
            ${line(d.note, `font-size:${mm(1.9)};color:#64748b;margin-top:${mm(0.4)}`)}
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;gap:${mm(2)};background:#fff;border-radius:${mm(2.4)};padding:${mm(1.2)} ${mm(2.4)}">
            <div style="font-family:${MONO};font-size:${mm(3.3)};font-weight:800;letter-spacing:${mm(0.3)};color:${o.primary};white-space:nowrap">${esc(d.code)}</div>
            ${line(expiry, `font-size:${mm(1.9)};color:#64748b;white-space:nowrap`)}
          </div>
        </div>
        ${o.showQr && qrSvg ? `<div style="display:flex;align-items:center">${qr("#fff")}</div>` : ""}
      </div>`;

    default:
      // modern
      return `<div style="${base}background:linear-gradient(135deg,${o.primary},${o.accent});color:#fff;display:flex;gap:${mm(3)};padding:${mm(4.5)} ${mm(5)}">
        <div style="position:absolute;right:${mm(-12)};top:${mm(-14)};width:${mm(36)};height:${mm(36)};border-radius:50%;background:rgba(255,255,255,.12)"></div>
        <div style="position:absolute;left:${mm(-8)};bottom:${mm(-16)};width:${mm(28)};height:${mm(28)};border-radius:50%;background:rgba(255,255,255,.08)"></div>
        <div style="flex:1;min-width:0;display:flex;flex-direction:column;justify-content:space-between;position:relative">
          <div>
            ${line(d.storeName, `font-size:${mm(2.4)};font-weight:700;letter-spacing:${mm(0.25)};text-transform:uppercase;opacity:.85`)}
            ${line(d.offer, `font-size:${mm(9)};font-weight:900;margin-top:${mm(1.2)};white-space:nowrap`)}
            ${line(d.headline, `font-size:${mm(2.8)};font-weight:600;margin-top:${mm(0.8)};overflow:hidden;max-height:${mm(6.6)}`)}
            ${line(cond, `font-size:${mm(2.1)};opacity:.88;margin-top:${mm(0.8)}`)}
            ${line(d.note, `font-size:${mm(1.9)};opacity:.7;margin-top:${mm(0.5)}`)}
          </div>
          <div style="display:flex;align-items:center;gap:${mm(2)};flex-wrap:wrap">
            <div style="background:#fff;color:${o.primary};border-radius:${mm(1.6)};padding:${mm(0.9)} ${mm(2.2)};font-family:${MONO};font-size:${mm(3.4)};font-weight:800;letter-spacing:${mm(0.3)};white-space:nowrap">${esc(d.code)}</div>
            ${line(expiry, `font-size:${mm(2)};opacity:.85;white-space:nowrap`)}
          </div>
        </div>
        ${o.showQr && qrSvg ? `<div style="display:flex;align-items:flex-end;position:relative">${qr("#fff")}</div>` : ""}
      </div>`;
  }
}

async function qrSvgFor(text: string) {
  const QR = (await import("qrcode")).default;
  const svg = await QR.toString(text, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#111827", light: "#ffffff00" } });
  return svg.replace("<svg ", '<svg style="width:100%;height:100%;display:block" ');
}

/** Số thẻ trên mỗi trang giấy (tự chọn giấy dọc / ngang cho được nhiều thẻ hơn). */
export function pageLayout(o: CardOptions) {
  const paper = PAPERS.find((p) => p.id === o.paper) ?? PAPERS[0];
  if (paper.id === "card") return { pw: o.w, ph: o.h, cols: 1, rows: 1, margin: 0, gap: 0, perPage: 1, landscape: false };
  const fit = (pw: number, ph: number) => ({
    cols: Math.max(0, Math.floor((pw - 2 * o.margin + o.gap) / (o.w + o.gap))),
    rows: Math.max(0, Math.floor((ph - 2 * o.margin + o.gap) / (o.h + o.gap))),
  });
  const p = fit(paper.w, paper.h);
  const l = fit(paper.h, paper.w);
  const landscape = l.cols * l.rows > p.cols * p.rows;
  const g = landscape ? l : p;
  return {
    pw: landscape ? paper.h : paper.w,
    ph: landscape ? paper.w : paper.h,
    ...g,
    margin: o.margin,
    gap: o.gap,
    perPage: g.cols * g.rows,
    landscape,
  };
}

/** Dựng toàn bộ trang in vào iframe ẩn rồi mở hộp thoại in (chọn "Lưu PDF" để xuất file). */
async function printCards(o: CardOptions, cards: CardData[], title: string) {
  const L = pageLayout(o);
  if (!L.perPage) throw new Error("Thẻ lớn hơn khổ giấy — giảm kích thước thẻ hoặc lề");
  const qrCache = new Map<string, string>();
  const htmlCards: string[] = [];
  for (const c of cards) {
    let qr: string | null = null;
    if (o.showQr) {
      qr = qrCache.get(c.code) ?? (await qrSvgFor(c.code));
      qrCache.set(c.code, qr);
    }
    htmlCards.push(`<div class="cell">${renderCard(o, c, qr)}</div>`);
  }
  const pages: string[] = [];
  for (let i = 0; i < htmlCards.length; i += L.perPage) pages.push(`<div class="page">${htmlCards.slice(i, i + L.perPage).join("")}</div>`);
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;600;700;800;900&family=JetBrains+Mono:wght@700;800&display=swap" rel="stylesheet">
<style>
@page { size: ${L.pw}mm ${L.ph}mm; margin: 0 }
html, body { margin: 0; padding: 0; background: #fff }
* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact }
.page { width: ${L.pw}mm; height: ${L.ph}mm; padding: ${L.margin}mm; display: grid;
  grid-template-columns: repeat(${L.cols}, ${o.w}mm); grid-auto-rows: ${o.h}mm; gap: ${L.gap}mm;
  justify-content: center; align-content: start; overflow: hidden; break-after: page; page-break-after: always }
.page:last-child { break-after: auto; page-break-after: auto }
.cell { width: ${o.w}mm; height: ${o.h}mm; ${o.cutMarks ? `outline: 0.2mm dashed #b8bec8; outline-offset: ${(L.gap / 2).toFixed(2)}mm;` : ""} }
</style></head><body>${pages.join("")}</body></html>`;

  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  document.body.appendChild(iframe);
  await new Promise<void>((resolve) => {
    iframe.onload = () => resolve();
    iframe.srcdoc = html;
  });
  const win = iframe.contentWindow!;
  try {
    await Promise.race([win.document.fonts.ready, new Promise((r) => setTimeout(r, 2500))]);
  } catch {
    /* bỏ qua: in bằng font hệ thống */
  }
  win.focus();
  win.print();
  setTimeout(() => iframe.remove(), 60_000);
  return { pages: pages.length };
}

// ───────────────────────── Xuất Excel ─────────────────────────

async function exportExcel(store: StoreConfig, v: StoreVoucherItem, codes: { code: string; usedAt?: string | null; orderCode?: string | null }[]) {
  const writeXlsxFile = (await import("write-excel-file/browser")).default;
  const head = (value: string) => ({ value, fontWeight: "bold" as const, backgroundColor: "#1e293b", textColor: "#ffffff" });
  const offer = [offerText(v), offerSub(v)].filter(Boolean).join(" — ");
  const rows = [
    ["STT", "Mã voucher", "Chương trình", "Ưu đãi", "Đơn tối thiểu", "Hiệu lực từ", "Đến ngày", "Trạng thái", "Ngày dùng", "Mã đơn"].map(head),
    ...codes.map((c, i) => [
      { value: i + 1, type: Number },
      { value: c.code, type: String, fontWeight: "bold" as const },
      { value: v.title, type: String },
      { value: offer, type: String },
      { value: v.minOrderValue, type: Number, format: "#,##0" },
      { value: dayjs(v.startDate).format("DD/MM/YYYY"), type: String },
      { value: dayjs(v.endDate).format("DD/MM/YYYY"), type: String },
      { value: c.usedAt ? "Đã dùng" : "Chưa dùng", type: String, textColor: c.usedAt ? "#94a3b8" : "#059669" },
      { value: c.usedAt ? dayjs(c.usedAt).format("DD/MM/YYYY HH:mm") : "", type: String },
      { value: c.orderCode ?? "", type: String },
    ]),
  ];
  await writeXlsxFile(rows, {
    sheet: "Mã voucher",
    stickyRowsCount: 1,
    columns: [{ width: 6 }, { width: 20 }, { width: 32 }, { width: 28 }, { width: 14 }, { width: 13 }, { width: 13 }, { width: 12 }, { width: 18 }, { width: 18 }],
  }).toFile(`voucher-${store.slug}-${v.code}-${dayjs().format("YYYYMMDD-HHmm")}.xlsx`);
}

// ───────────────────────── Drawer quản lý mã ─────────────────────────

/** Mã thẻ của một voucher: sinh hàng loạt, xem đã dùng / chưa dùng, xuất Excel, in thẻ. */
export function VoucherCodesDrawer({
  open,
  store,
  voucher,
  tierName,
  onClose,
  onStats,
}: {
  open: boolean;
  store: StoreConfig;
  voucher: StoreVoucherItem | null;
  tierName?: string;
  onClose: () => void;
  onStats: (voucherId: string, stats: { codeCount: number; codeUsed: number; quantity?: number }) => void;
}) {
  const { message } = AntApp.useApp();
  const [codes, setCodes] = useState<VoucherCodeItem[] | null>(null);
  const [filter, setFilter] = useState<"all" | "unused" | "used">("all");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [count, setCount] = useState(100);
  const [prefix, setPrefix] = useState("");
  const [length, setLength] = useState(8);
  const [busy, setBusy] = useState(false);
  const [printList, setPrintList] = useState<string[] | null>(null);
  const [sharedCount, setSharedCount] = useState(50);

  const vid = voucher?.id;
  const load = async () => {
    if (!vid) return;
    try {
      const list = await fetchVoucherCodes(store.id, vid);
      setCodes(list);
      onStats(vid, { codeCount: list.length, codeUsed: list.filter((c) => c.usedAt).length });
    } catch (e) {
      message.error(errMsg(e, "Không tải được danh sách mã"));
      setCodes([]);
    }
  };
  useEffect(() => {
    if (!open || !voucher) return;
    setCodes(null);
    setSelected([]);
    setFilter("all");
    setQ("");
    setPrefix(voucher.code.replace(/[^A-Z0-9]/gi, "").slice(0, 4).toUpperCase());
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, vid]);

  const list = codes ?? [];
  const used = list.filter((c) => c.usedAt).length;
  const kw = q.trim().toUpperCase();
  const shown = list.filter(
    (c) => (filter === "all" || (filter === "used" ? !!c.usedAt : !c.usedAt)) && (!kw || c.code.includes(kw) || c.orderCode?.includes(kw)),
  );
  const target = selected.length ? list.filter((c) => selected.includes(c.id)) : shown;

  const generate = async () => {
    if (!voucher) return;
    setBusy(true);
    try {
      const r = await generateVoucherCodes(store.id, voucher.id, { count, prefix: prefix ? `${prefix}-` : "", length });
      message.success(`Đã sinh ${r.created.toLocaleString("vi-VN")} mã mới`);
      onStats(voucher.id, { codeCount: r.total, codeUsed: used, quantity: r.quantity });
      await load();
    } catch (e) {
      message.error(errMsg(e, "Sinh mã thất bại"));
    } finally {
      setBusy(false);
    }
  };

  const removeUnused = async () => {
    if (!voucher) return;
    setBusy(true);
    try {
      const ids = selected.length ? selected : undefined;
      const r = await deleteVoucherCodes(store.id, voucher.id, ids);
      message.success(`Đã xoá ${r.deleted} mã chưa dùng`);
      setSelected([]);
      await load();
    } catch (e) {
      message.error(errMsg(e, "Xoá mã thất bại"));
    } finally {
      setBusy(false);
    }
  };

  const doExport = async () => {
    if (!voucher || !target.length) return;
    try {
      await exportExcel(store, voucher, target);
    } catch {
      message.error("Không xuất được file Excel");
    }
  };

  const sample = (prefix ? `${prefix}-` : "") + "X".repeat(length);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      size={880}
      destroyOnHidden
      title={
        voucher && (
          <span className="inline-flex items-center gap-2">
            <LuTicket size={17} /> Mã thẻ · <span className="font-mono">{voucher.code}</span>
          </span>
        )
      }
    >
      {voucher && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Tổng mã thẻ", value: list.length, cls: "text-slate-900" },
              { label: "Chưa dùng", value: list.length - used, cls: "text-emerald-600" },
              { label: "Đã dùng", value: used, cls: "text-slate-400" },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-3">
                <div className="text-[11px] font-semibold text-slate-500">{s.label}</div>
                <div className={`text-2xl font-extrabold ${s.cls}`}>{s.value.toLocaleString("vi-VN")}</div>
              </div>
            ))}
          </div>

          {/* Sinh mã */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 text-sm font-bold text-slate-900">Sinh mã dùng 1 lần để in thẻ</div>
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-xs font-semibold text-slate-600">
                Số lượng mã
                <InputNumber className="mt-1 block" min={1} max={5000} value={count} onChange={(v) => setCount(Number(v) || 1)} style={{ width: 120 }} />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Tiền tố
                <Input
                  className="mt-1 block font-mono"
                  value={prefix}
                  maxLength={10}
                  onChange={(e) => setPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                  style={{ width: 120 }}
                  placeholder="VD: TET"
                />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Độ dài phần ngẫu nhiên
                <InputNumber className="mt-1 block" min={4} max={16} value={length} onChange={(v) => setLength(Number(v) || 8)} style={{ width: 120 }} />
              </label>
              <Button type="primary" icon={<LuSparkles size={15} />} loading={busy} onClick={generate}>
                Sinh {count.toLocaleString("vi-VN")} mã
              </Button>
            </div>
            <div className="mt-2 text-[11px] text-slate-500">
              Mẫu mã: <span className="font-mono font-bold text-slate-700">{sample}</span> · Không dùng ký tự dễ nhầm (0/O, 1/I/L). Mỗi mã chỉ dùng
              được 1 lần; số lượt của voucher tự tăng theo số mã.
            </div>
          </div>

          {/* Danh sách mã */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Segmented
                size="small"
                value={filter}
                onChange={(v) => setFilter(v as typeof filter)}
                options={[
                  { value: "all", label: "Tất cả" },
                  { value: "unused", label: "Chưa dùng" },
                  { value: "used", label: "Đã dùng" },
                ]}
              />
              <Input size="small" allowClear placeholder="Tìm mã / mã đơn" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 170 }} />
              <Button size="small" type="text" icon={<LuRefreshCw size={13} />} onClick={load} />
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Button size="small" icon={<LuDownload size={13} />} disabled={!target.length} onClick={doExport}>
                Excel ({target.length.toLocaleString("vi-VN")})
              </Button>
              <Button
                size="small"
                type="primary"
                icon={<LuPrinter size={13} />}
                disabled={!target.some((c) => !c.usedAt)}
                onClick={() => setPrintList(target.filter((c) => !c.usedAt).map((c) => c.code))}
              >
                In thẻ ({target.filter((c) => !c.usedAt).length.toLocaleString("vi-VN")})
              </Button>
              <Popconfirm
                title={selected.length ? `Xoá ${selected.length} mã đã chọn (chỉ mã chưa dùng)?` : "Xoá toàn bộ mã chưa dùng?"}
                onConfirm={removeUnused}
              >
                <Button size="small" danger icon={<LuTrash2 size={13} />} disabled={!list.length || list.length === used} />
              </Popconfirm>
            </div>
          </div>
          {selected.length > 0 && (
            <div className="text-xs text-slate-500">
              Đang chọn {selected.length} mã ·{" "}
              <button type="button" className="font-semibold text-brand-600" onClick={() => setSelected([])}>
                Bỏ chọn
              </button>
            </div>
          )}

          {codes === null ? (
            <div className="flex justify-center py-10">
              <Spin />
            </div>
          ) : list.length ? (
            <Table
              rowKey="id"
              size="small"
              dataSource={shown}
              pagination={{ pageSize: 50, showSizeChanger: false }}
              rowSelection={{ selectedRowKeys: selected, onChange: (keys) => setSelected(keys as string[]) }}
              columns={[
                { title: "Mã", dataIndex: "code", render: (c) => <span className="font-mono font-bold">{c}</span> },
                {
                  title: "Trạng thái",
                  dataIndex: "usedAt",
                  render: (u) => (u ? <Tag>Đã dùng</Tag> : <Tag color="green">Chưa dùng</Tag>),
                },
                { title: "Ngày dùng", dataIndex: "usedAt", render: (u) => (u ? dayjs(u).format("DD/MM/YY HH:mm") : "—") },
                { title: "Đơn hàng", dataIndex: "orderCode", render: (c) => (c ? <span className="font-mono text-xs">{c}</span> : "—") },
                { title: "Ngày tạo", dataIndex: "createdAt", render: (d) => <span className="text-xs text-slate-500">{dayjs(d).format("DD/MM/YY")}</span> },
              ]}
            />
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center">
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <span className="text-xs text-slate-500">
                    Chưa có mã thẻ. Sinh mã ở trên — hoặc in thẻ dùng chung mã <b className="font-mono">{voucher.code}</b>.
                  </span>
                }
              />
              <div className="mt-2 flex items-center justify-center gap-2">
                <InputNumber size="small" min={1} max={2000} value={sharedCount} onChange={(v) => setSharedCount(Number(v) || 1)} suffix="thẻ" style={{ width: 110 }} />
                <Button size="small" icon={<LuPrinter size={13} />} onClick={() => setPrintList(Array(sharedCount).fill(voucher.code))}>
                  In thẻ mã chung
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {voucher && (
        <CardPrintModal
          open={!!printList}
          store={store}
          voucher={voucher}
          tierName={tierName}
          codes={printList ?? []}
          onClose={() => setPrintList(null)}
        />
      )}
    </Drawer>
  );
}

// ───────────────────────── Thiết kế & in thẻ ─────────────────────────

const PREF_KEY = "remini.voucherCard";
const loadPrefs = (): Partial<CardOptions> => {
  try {
    return JSON.parse(localStorage.getItem(PREF_KEY) ?? "{}");
  } catch {
    return {};
  }
};
const savePrefs = (o: CardOptions) => {
  try {
    const { headline: _h, ...rest } = o;
    localStorage.setItem(PREF_KEY, JSON.stringify(rest));
  } catch {
    /* trình duyệt chặn lưu — bỏ qua */
  }
};

export function CardPrintModal({
  open,
  store,
  voucher,
  tierName,
  codes,
  onClose,
}: {
  open: boolean;
  store: StoreConfig;
  voucher: StoreVoucherItem;
  tierName?: string;
  codes: string[];
  onClose: () => void;
}) {
  const { message } = AntApp.useApp();
  const [o, setO] = useState<CardOptions>(() => ({
    template: "modern",
    sizeId: "cr80",
    w: 85.6,
    h: 54,
    paper: "a4",
    margin: 8,
    gap: 4,
    cutMarks: true,
    rounded: true,
    primary: store.theme?.primary || "#1657f3",
    accent: store.theme?.accent || "#f59e0b",
    showQr: true,
    showExpiry: true,
    showCondition: true,
    headline: "",
    note: "Xuất trình thẻ khi thanh toán",
    ...loadPrefs(),
  }));
  const set = (patch: Partial<CardOptions>) => setO((x) => ({ ...x, ...patch }));
  const [qr, setQr] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);

  const sampleCode = codes[0] ?? voucher.code;
  useEffect(() => {
    if (!open) return;
    let alive = true;
    qrSvgFor(sampleCode).then((s) => alive && setQr(s));
    return () => {
      alive = false;
    };
  }, [open, sampleCode]);

  const data = (code: string): CardData => ({
    storeName: store.name,
    headline: o.headline.trim() || voucher.title,
    offer: offerText(voucher),
    offerSub: offerSub(voucher),
    condition: conditionText(voucher, tierName),
    expiry: `HSD: ${dayjs(voucher.endDate).format("DD/MM/YYYY")}`,
    code,
    note: o.note.trim(),
  });

  const L = pageLayout(o);
  const pages = L.perPage ? Math.ceil(codes.length / L.perPage) : 0;
  const cardHtml = useMemo(() => renderCard(o, data(sampleCode), qr), [o, qr, sampleCode, voucher, store.name]); // eslint-disable-line react-hooks/exhaustive-deps

  // Xem trước: 1 mm ≈ 3,78 px; thu nhỏ cho vừa khung 440px
  const PX = 3.78;
  const scale = Math.min(1.25, 440 / (o.w * PX), 300 / (o.h * PX));
  const paperScale = Math.min(150 / (L.pw * PX), 200 / (L.ph * PX));

  const doPrint = async () => {
    if (!L.perPage) return message.error("Thẻ lớn hơn khổ giấy — giảm kích thước thẻ hoặc lề");
    setPrinting(true);
    savePrefs(o);
    try {
      await printCards(o, codes.map(data), `Thẻ voucher ${voucher.code}`);
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Không in được");
    } finally {
      setPrinting(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={1040}
      centered
      destroyOnHidden
      title={
        <span className="inline-flex items-center gap-2">
          <LuPrinter size={17} /> In thẻ voucher · {codes.length.toLocaleString("vi-VN")} thẻ
        </span>
      }
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-slate-500">
            {L.perPage
              ? `${L.perPage} thẻ / trang${L.landscape ? " (giấy ngang)" : ""} · ${pages} trang`
              : "Thẻ lớn hơn khổ giấy"}{" "}
            · Ở hộp thoại in chọn “Lưu dưới dạng PDF” để xuất file, tỉ lệ 100%.
          </span>
          <div className="flex gap-2">
            <Button onClick={onClose}>Đóng</Button>
            <Button type="primary" icon={<LuPrinter size={15} />} loading={printing} onClick={doPrint} disabled={!codes.length}>
              In {codes.length.toLocaleString("vi-VN")} thẻ
            </Button>
          </div>
        </div>
      }
    >
      <div className="grid gap-5 md:grid-cols-[1fr_320px]">
        {/* Xem trước */}
        <div className="space-y-4">
          <div className="flex min-h-[300px] items-center justify-center rounded-2xl bg-[repeating-conic-gradient(#f1f5f9_0_25%,#f8fafc_0_50%)] bg-[length:20px_20px] p-4">
            <div style={{ width: o.w * PX * scale, height: o.h * PX * scale }}>
              <div
                style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: `${o.w}mm`, height: `${o.h}mm` }}
                className="drop-shadow-xl"
                dangerouslySetInnerHTML={{ __html: cardHtml }}
              />
            </div>
          </div>

          <div>
            <div className="mb-2 text-xs font-bold text-slate-600">Mẫu thẻ</div>
            <div className="grid grid-cols-5 gap-2">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => set({ template: t.id })}
                  className={`rounded-xl border p-1.5 text-left transition ${
                    o.template === t.id ? "border-brand-600 ring-2 ring-brand-600" : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <TemplateThumb o={{ ...o, template: t.id }} />
                  <div className="mt-1 truncate text-[11px] font-bold text-slate-800">{t.name}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tuỳ chọn */}
        <div className="space-y-3 text-xs">
          <div>
            <div className="mb-1 font-bold text-slate-600">Kích thước thẻ</div>
            <Select
              className="w-full"
              value={o.sizeId}
              onChange={(id: string) => {
                const s = SIZES.find((x) => x.id === id)!;
                set(id === "custom" ? { sizeId: id } : { sizeId: id, w: s.w, h: s.h });
              }}
              options={SIZES.map((s) => ({ value: s.id, label: s.id === "custom" ? s.name : `${s.name} — ${s.w} × ${s.h} mm` }))}
            />
            {o.sizeId === "custom" && (
              <div className="mt-2 flex items-center gap-2">
                <InputNumber min={30} max={297} value={o.w} onChange={(v) => set({ w: Number(v) || 30 })} suffix="mm" style={{ width: 110 }} />
                ×
                <InputNumber min={20} max={297} value={o.h} onChange={(v) => set({ h: Number(v) || 20 })} suffix="mm" style={{ width: 110 }} />
              </div>
            )}
          </div>

          <div>
            <div className="mb-1 font-bold text-slate-600">Khổ giấy in</div>
            <Select className="w-full" value={o.paper} onChange={(paper: string) => set({ paper })} options={PAPERS.map((p) => ({ value: p.id, label: p.name }))} />
            {o.paper !== "card" && (
              <div className="mt-2 flex items-center gap-3">
                <label className="flex items-center gap-1.5">
                  Lề
                  <InputNumber size="small" min={0} max={30} value={o.margin} onChange={(v) => set({ margin: Number(v) || 0 })} suffix="mm" style={{ width: 84 }} />
                </label>
                <label className="flex items-center gap-1.5">
                  Khoảng cách
                  <InputNumber size="small" min={0} max={20} value={o.gap} onChange={(v) => set({ gap: Number(v) || 0 })} suffix="mm" style={{ width: 84 }} />
                </label>
              </div>
            )}
            {o.paper !== "card" && L.perPage > 0 && (
              <div className="mt-2 flex items-center gap-3">
                <div
                  className="grid shrink-0 bg-white shadow ring-1 ring-slate-200"
                  style={{
                    width: L.pw * PX * paperScale,
                    height: L.ph * PX * paperScale,
                    padding: L.margin * PX * paperScale,
                    gridTemplateColumns: `repeat(${L.cols}, ${o.w * PX * paperScale}px)`,
                    gridAutoRows: `${o.h * PX * paperScale}px`,
                    gap: L.gap * PX * paperScale,
                    justifyContent: "center",
                    alignContent: "start",
                  }}
                >
                  {Array.from({ length: L.perPage }).map((_, i) => (
                    <div key={i} className="rounded-[1px]" style={{ background: o.primary, opacity: 0.75 }} />
                  ))}
                </div>
                <div className="text-slate-500">
                  <b className="text-slate-800">
                    {L.cols} × {L.rows}
                  </b>{" "}
                  = {L.perPage} thẻ / trang
                  <br />
                  {pages} trang cho {codes.length.toLocaleString("vi-VN")} thẻ
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label>
              <div className="mb-1 font-bold text-slate-600">Màu chính</div>
              <ColorPicker value={o.primary} onChangeComplete={(c) => set({ primary: c.toHexString() })} showText size="small" />
            </label>
            <label>
              <div className="mb-1 font-bold text-slate-600">Màu phụ</div>
              <ColorPicker value={o.accent} onChangeComplete={(c) => set({ accent: c.toHexString() })} showText size="small" />
            </label>
          </div>

          <div>
            <div className="mb-1 font-bold text-slate-600">Dòng tiêu đề</div>
            <Input value={o.headline} onChange={(e) => set({ headline: e.target.value })} placeholder={voucher.title} maxLength={60} />
          </div>
          <div>
            <div className="mb-1 font-bold text-slate-600">Ghi chú nhỏ</div>
            <Input value={o.note} onChange={(e) => set({ note: e.target.value })} placeholder="VD: Mỗi thẻ dùng 1 lần" maxLength={60} />
          </div>

          <div className="grid grid-cols-2 gap-y-1.5">
            <Checkbox checked={o.showQr} onChange={(e) => set({ showQr: e.target.checked })}>
              Mã QR
            </Checkbox>
            <Checkbox checked={o.showExpiry} onChange={(e) => set({ showExpiry: e.target.checked })}>
              Hạn sử dụng
            </Checkbox>
            <Checkbox checked={o.showCondition} onChange={(e) => set({ showCondition: e.target.checked })}>
              Điều kiện
            </Checkbox>
            <Checkbox checked={o.rounded} onChange={(e) => set({ rounded: e.target.checked })}>
              Bo góc
            </Checkbox>
            <Checkbox checked={o.cutMarks} onChange={(e) => set({ cutMarks: e.target.checked })} disabled={o.paper === "card"}>
              Đường cắt
            </Checkbox>
          </div>
        </div>
      </div>
    </Modal>
  );
}

/** Ảnh thu nhỏ của mẫu (không QR, mã giả) */
function TemplateThumb({ o }: { o: CardOptions }) {
  const html = useMemo(
    () =>
      renderCard({ ...o, w: 86, h: 54, showQr: false, note: "" }, {
        storeName: "CỬA HÀNG",
        headline: "Ưu đãi",
        offer: "GIẢM 20%",
        offerSub: "",
        condition: "",
        expiry: "HSD 31/12",
        code: "ABCD2345",
        note: "",
      }, null),
    [o],
  );
  const s = 0.3;
  return (
    <div className="overflow-hidden rounded-md" style={{ width: "100%", aspectRatio: "86 / 54" }}>
      <div style={{ transform: `scale(${s})`, transformOrigin: "top left", width: "86mm", height: "54mm" }} dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
