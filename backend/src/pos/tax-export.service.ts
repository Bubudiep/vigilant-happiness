import { BadRequestException, Injectable } from "@nestjs/common";
import * as ExcelJS from "exceljs";
import type { AuthContext } from "../common/guards/app-auth.guard";
import { PrismaService } from "../prisma/prisma.service";
import { StoresService } from "../stores/stores.service";
import { InventoryService } from "./inventory.service";

const VN = 7 * 3_600_000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const vnDay = (d: Date) => new Date(d.getTime() + VN).toISOString().slice(0, 10);
const dmy = (iso: string) => iso.split("-").reverse().join("/");

/**
 * Nhóm ngành tính thuế của hộ / cá nhân kinh doanh (tỷ lệ % trên doanh thu, theo Thông tư 40/2021/TT-BTC).
 * Chỉ để ước tính — chủ shop đối chiếu quy định hiện hành (ngưỡng doanh thu chịu thuế, cách kê khai) trước khi nộp.
 */
export const TAX_GROUPS = {
  distribution: { label: "Phân phối, cung cấp hàng hoá", vat: 1, pit: 0.5 },
  production: { label: "Sản xuất, vận tải, dịch vụ có gắn với hàng hoá (gồm ăn uống)", vat: 3, pit: 1.5 },
  services: { label: "Dịch vụ, xây dựng không bao thầu nguyên vật liệu", vat: 5, pit: 2 },
  other: { label: "Hoạt động kinh doanh khác", vat: 2, pit: 1 },
} as const;
export type TaxGroup = keyof typeof TAX_GROUPS;
const isGroup = (v: unknown): v is TaxGroup => typeof v === "string" && v in TAX_GROUPS;

const PAY: Record<string, string> = { cash: "Tiền mặt", cod: "Tiền mặt khi nhận", bank_transfer: "Chuyển khoản", ewallet: "Ví điện tử", card: "Thẻ" };
const SOURCE: Record<string, string> = { miniapp: "Mini App", admin: "Tạo tại quầy", pos: "Bán tại bàn" };

/**
 * Xuất Excel phục vụ kê khai / nộp thuế: tổng hợp doanh thu – giá vốn – lợi nhuận, thuế GTGT & TNCN ước tính theo nhóm ngành,
 * sổ doanh thu bán hàng hoá, dịch vụ (dạng S1-HKD), doanh thu theo ngày, theo sản phẩm và phiếu nhập hàng trong kỳ.
 */
@Injectable()
export class TaxExportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stores: StoresService,
    private readonly inventory: InventoryService,
  ) {}

  async build(auth: AuthContext, storeId: string, q: { from?: string; to?: string; goods?: string; services?: string }) {
    await this.stores.ensureSection(auth, storeId, "reports");
    const from = String(q.from ?? "");
    const to = String(q.to ?? "");
    if (!DATE_RE.test(from) || !DATE_RE.test(to) || from > to) throw new BadRequestException("Khoảng ngày không hợp lệ");
    const start = new Date(new Date(`${from}T00:00:00Z`).getTime() - VN);
    const end = new Date(new Date(`${to}T00:00:00Z`).getTime() - VN + 86_400_000);
    if (end.getTime() - start.getTime() > 400 * 86_400_000) throw new BadRequestException("Tối đa 400 ngày (1 năm)");
    const goodsGroup: TaxGroup = isGroup(q.goods) ? q.goods : "distribution";
    const serviceGroup: TaxGroup = isGroup(q.services) ? q.services : "services";

    const [store, orders, receipts] = await Promise.all([
      this.prisma.store.findUniqueOrThrow({ where: { id: storeId }, select: { name: true, address: true, phone: true, customer: { select: { name: true, companyName: true } } } }),
      this.prisma.storeOrder.findMany({
        where: { storeId, status: "completed", createdAt: { gte: start, lt: end } },
        orderBy: { createdAt: "asc" },
        include: { items: true },
      }),
      this.prisma.storeStockReceipt.findMany({ where: { storeId, status: "active", receivedAt: { gte: start, lt: end } }, orderBy: { receivedAt: "asc" } }),
    ]);

    // Loại món (hàng hoá / dịch vụ) để chia doanh thu theo nhóm ngành
    const productIds = [...new Set(orders.flatMap((o) => o.items.map((i) => i.productId).filter((x): x is string => !!x)))];
    const kinds = new Map(
      (await this.prisma.storeProduct.findMany({ where: { storeId, id: { in: productIds } }, select: { id: true, kind: true } })).map((p) => [p.id, p.kind]),
    );
    const missing = [...new Set(orders.flatMap((o) => o.items.filter((i) => i.productId && i.unitCost == null).map((i) => i.productId!)))];
    const current = missing.length ? await this.inventory.currentCosts(storeId, missing) : new Map<string, number>();
    const costOf = (i: { productId: string | null; unitCost: number | null }) => i.unitCost ?? (i.productId ? (current.get(i.productId) ?? 0) : 0);
    // Dòng không gắn sản phẩm (tiền giờ bàn, dòng tự nhập) tính là dịch vụ
    const isServiceLine = (i: { productId: string | null }) => !i.productId || kinds.get(i.productId) === "service";

    const groupRevenue: Record<TaxGroup, number> = { distribution: 0, production: 0, services: 0, other: 0 };
    const byDay = new Map<string, { orders: number; revenue: number; cost: number }>();
    const byProduct = new Map<string, { name: string; group: TaxGroup; quantity: number; revenue: number; cost: number }>();
    let revenue = 0;
    let discount = 0;
    let cogs = 0;

    for (const o of orders) {
      revenue += o.totalAmount;
      discount += o.discountAmount;
      // Doanh thu đơn (sau giảm giá, gồm phí ship) chia cho từng dòng theo tỉ lệ tiền hàng
      const lineSum = o.items.reduce((s, i) => s + i.lineTotal, 0);
      const ratio = lineSum ? o.totalAmount / lineSum : 0;
      let orderCost = 0;
      for (const i of o.items) {
        const group = isServiceLine(i) ? serviceGroup : goodsGroup;
        const rev = i.lineTotal * ratio;
        groupRevenue[group] += rev;
        const cost = costOf(i) * i.quantity;
        orderCost += cost;
        const k = i.productId ?? `name:${i.productName.replace(/ \(.*\)$/, "")}`;
        const g = byProduct.get(k) ?? { name: i.productName.replace(/ \(.*\)$/, ""), group, quantity: 0, revenue: 0, cost: 0 };
        g.quantity += i.quantity;
        g.revenue += rev;
        g.cost += cost;
        byProduct.set(k, g);
      }
      if (!o.items.length) groupRevenue[goodsGroup] += o.totalAmount;
      cogs += orderCost;
      const d = vnDay(o.createdAt);
      const day = byDay.get(d) ?? { orders: 0, revenue: 0, cost: 0 };
      day.orders++;
      day.revenue += o.totalAmount;
      day.cost += orderCost;
      byDay.set(d, day);
    }
    const purchases = receipts.reduce((s, r) => s + r.total, 0);

    // ─────────────── Excel ───────────────
    const wb = new ExcelJS.Workbook();
    wb.creator = "reMini";
    wb.created = new Date();
    const MONEY = '#,##0" đ"';
    const head = (ws: ExcelJS.Worksheet, row: number) => {
      const r = ws.getRow(row);
      r.font = { bold: true };
      r.alignment = { vertical: "middle", wrapText: true };
      r.eachCell((c) => {
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE9EEF5" } };
        c.border = { bottom: { style: "thin", color: { argb: "FF9AA5B4" } } };
      });
    };
    const title = (ws: ExcelJS.Worksheet, text: string, sub: string) => {
      ws.addRow([text]).font = { bold: true, size: 14 };
      ws.addRow([sub]).font = { italic: true, color: { argb: "FF5B6577" } };
      ws.addRow([]);
    };
    const period = `Kỳ: ${dmy(from)} – ${dmy(to)}`;
    const owner = store.customer?.companyName || store.customer?.name || "";

    // 1. Tổng hợp
    const s1 = wb.addWorksheet("Tổng hợp");
    s1.columns = [{ width: 48 }, { width: 20 }, { width: 12 }, { width: 18 }, { width: 12 }, { width: 18 }, { width: 18 }];
    title(s1, "BÁO CÁO DOANH THU – LỢI NHUẬN & THUẾ ƯỚC TÍNH", period);
    for (const [k, v] of [
      ["Hộ / cá nhân kinh doanh", owner],
      ["Cửa hàng", store.name],
      ["Địa chỉ", store.address ?? ""],
      ["Điện thoại", store.phone ?? ""],
      ["Ngày xuất", dmy(vnDay(new Date()))],
    ]) s1.addRow([k, v]);
    s1.addRow([]);
    if (!orders.length) s1.addRow(["Không có đơn hoàn thành trong kỳ này."]).font = { bold: true, color: { argb: "FFB45309" } };
    const sumRows: [string, number | string][] = [
      ["Số đơn hoàn thành", orders.length],
      ["Doanh thu (đã trừ giảm giá, gồm phí giao hàng)", revenue],
      ["Giảm giá đã trừ", discount],
      ["Giá vốn hàng bán", Math.round(cogs)],
      ["Lợi nhuận gộp", Math.round(revenue - cogs)],
      ["Biên lợi nhuận gộp", revenue ? `${Math.round(((revenue - cogs) / revenue) * 1000) / 10}%` : "—"],
      ["Tiền nhập hàng trong kỳ (phiếu nhập kho)", purchases],
    ];
    for (const [k, v] of sumRows) {
      const r = s1.addRow([k, v]);
      if (typeof v === "number" && k !== "Số đơn hoàn thành") r.getCell(2).numFmt = MONEY;
    }
    s1.addRow([]);
    s1.addRow(["THUẾ ƯỚC TÍNH THEO NHÓM NGÀNH (tỷ lệ % trên doanh thu)"]).font = { bold: true };
    s1.addRow(["Nhóm ngành", "Doanh thu", "% GTGT", "Thuế GTGT", "% TNCN", "Thuế TNCN", "Tổng thuế"]);
    head(s1, s1.rowCount);
    let vatSum = 0;
    let pitSum = 0;
    for (const g of Object.keys(TAX_GROUPS) as TaxGroup[]) {
      const rev = Math.round(groupRevenue[g]);
      if (!rev) continue;
      const t = TAX_GROUPS[g];
      const vat = Math.round((rev * t.vat) / 100);
      const pit = Math.round((rev * t.pit) / 100);
      vatSum += vat;
      pitSum += pit;
      const r = s1.addRow([t.label, rev, t.vat / 100, vat, t.pit / 100, pit, vat + pit]);
      [2, 4, 6, 7].forEach((c) => (r.getCell(c).numFmt = MONEY));
      [3, 5].forEach((c) => (r.getCell(c).numFmt = "0.0%"));
    }
    const tr = s1.addRow(["Tổng cộng", revenue, "", vatSum, "", pitSum, vatSum + pitSum]);
    tr.font = { bold: true };
    [2, 4, 6, 7].forEach((c) => (tr.getCell(c).numFmt = MONEY));
    s1.addRow([]);
    for (const note of [
      "Ghi chú:",
      "• Doanh thu tính theo đơn đã hoàn thành trong kỳ (ngày tạo đơn, giờ Việt Nam); đơn huỷ / chưa hoàn thành không tính.",
      `• Hàng hoá tính vào nhóm “${TAX_GROUPS[goodsGroup].label}”; dịch vụ, tiền giờ bàn và dòng tự nhập tính vào nhóm “${TAX_GROUPS[serviceGroup].label}”.`,
      "• Tỷ lệ thuế theo Thông tư 40/2021/TT-BTC, chỉ để tham khảo. Đối chiếu quy định hiện hành (ngưỡng doanh thu không chịu thuế, phương pháp kê khai) hoặc hỏi cơ quan thuế / kế toán trước khi nộp.",
    ]) s1.addRow([note]).font = { italic: note !== "Ghi chú:", bold: note === "Ghi chú:", color: { argb: "FF5B6577" } };

    // 2. Sổ doanh thu (S1-HKD)
    const s2 = wb.addWorksheet("Sổ doanh thu (S1-HKD)");
    s2.columns = [{ width: 13 }, { width: 18 }, { width: 13 }, { width: 60 }, { width: 16 }, { width: 22 }, { width: 18 }, { width: 14 }];
    title(s2, "SỔ DOANH THU BÁN HÀNG HOÁ, DỊCH VỤ", `${store.name} · ${period}`);
    s2.addRow(["Ngày ghi sổ", "Số hiệu chứng từ", "Ngày chứng từ", "Diễn giải", "Doanh thu", "Khách hàng", "Thanh toán", "Nguồn"]);
    head(s2, s2.rowCount);
    for (const o of orders) {
      const d = dmy(vnDay(o.createdAt));
      const desc = o.items.map((i) => `${i.productName} x${i.quantity}`).join(", ");
      s2.addRow([d, o.code, d, desc, o.totalAmount, o.customerName, PAY[o.paymentMethod] ?? o.paymentMethod, SOURCE[o.source ?? ""] ?? o.source ?? ""]).getCell(5).numFmt = MONEY;
    }
    const s2t = s2.addRow(["", "", "", "Tổng cộng", revenue]);
    s2t.font = { bold: true };
    s2t.getCell(5).numFmt = MONEY;
    s2.views = [{ state: "frozen", ySplit: 4 }];

    // 3. Theo ngày
    const s3 = wb.addWorksheet("Theo ngày");
    s3.columns = [{ width: 14 }, { width: 10 }, { width: 18 }, { width: 18 }, { width: 18 }];
    title(s3, "DOANH THU THEO NGÀY", period);
    s3.addRow(["Ngày", "Số đơn", "Doanh thu", "Giá vốn", "Lợi nhuận gộp"]);
    head(s3, s3.rowCount);
    for (const [d, v] of [...byDay].sort(([a], [b]) => a.localeCompare(b))) {
      const r = s3.addRow([dmy(d), v.orders, v.revenue, Math.round(v.cost), Math.round(v.revenue - v.cost)]);
      [3, 4, 5].forEach((c) => (r.getCell(c).numFmt = MONEY));
    }
    const s3t = s3.addRow(["Tổng cộng", orders.length, revenue, Math.round(cogs), Math.round(revenue - cogs)]);
    s3t.font = { bold: true };
    [3, 4, 5].forEach((c) => (s3t.getCell(c).numFmt = MONEY));

    // 4. Theo sản phẩm
    const s4 = wb.addWorksheet("Theo sản phẩm");
    s4.columns = [{ width: 40 }, { width: 34 }, { width: 10 }, { width: 18 }, { width: 18 }, { width: 18 }];
    title(s4, "DOANH THU – LỢI NHUẬN THEO SẢN PHẨM / DỊCH VỤ", period);
    s4.addRow(["Sản phẩm / dịch vụ", "Nhóm ngành tính thuế", "Số lượng", "Doanh thu", "Giá vốn", "Lợi nhuận gộp"]);
    head(s4, s4.rowCount);
    for (const p of [...byProduct.values()].sort((a, b) => b.revenue - a.revenue)) {
      const r = s4.addRow([p.name, TAX_GROUPS[p.group].label, p.quantity, Math.round(p.revenue), Math.round(p.cost), Math.round(p.revenue - p.cost)]);
      [4, 5, 6].forEach((c) => (r.getCell(c).numFmt = MONEY));
    }

    // 5. Nhập hàng
    const s5 = wb.addWorksheet("Nhập hàng (chi phí)");
    s5.columns = [{ width: 13 }, { width: 16 }, { width: 26 }, { width: 60 }, { width: 18 }];
    title(s5, "PHIẾU NHẬP HÀNG TRONG KỲ", `${period} · không gồm phiếu đã huỷ`);
    s5.addRow(["Ngày", "Số phiếu", "Nhà cung cấp", "Hàng nhập", "Thành tiền"]);
    head(s5, s5.rowCount);
    for (const r of receipts) {
      const items = (Array.isArray(r.items) ? (r.items as { name?: string; quantity?: number; unitCost?: number }[]) : [])
        .map((i) => `${i.name ?? "?"} x${i.quantity ?? 0} @ ${(i.unitCost ?? 0).toLocaleString("vi-VN")}đ`)
        .join(", ");
      s5.addRow([dmy(vnDay(r.receivedAt)), r.code, r.supplier ?? "", items, r.total]).getCell(5).numFmt = MONEY;
    }
    const s5t = s5.addRow(["", "", "", "Tổng cộng", purchases]);
    s5t.font = { bold: true };
    s5t.getCell(5).numFmt = MONEY;

    const buffer = Buffer.from(await wb.xlsx.writeBuffer());
    const filename = `doanh-thu-thue_${from}_${to}.xlsx`;
    return { buffer, filename };
  }
}
