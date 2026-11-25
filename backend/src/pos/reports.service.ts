import { BadRequestException, Injectable } from "@nestjs/common";
import type { AuthContext } from "../common/guards/app-auth.guard";
import { PrismaService } from "../prisma/prisma.service";
import { StoresService } from "../stores/stores.service";

const VN = 7 * 3_600_000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const vnDay = (d: Date) => new Date(d.getTime() + VN).toISOString().slice(0, 10);
const vnHour = (d: Date) => new Date(d.getTime() + VN).getUTCHours();

/**
 * Báo cáo doanh thu của gian hàng (chỉ trang Báo cáo, không hiện ở Tổng quan).
 * Doanh thu = đơn đã hoàn thành trong kỳ (theo ngày tạo đơn, giờ VN). Đơn huỷ thống kê riêng.
 */
@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stores: StoresService,
  ) {}

  async revenue(auth: AuthContext, storeId: string, from: string, to: string) {
    await this.stores.ensureAccess(auth, storeId);
    if (!DATE_RE.test(from) || !DATE_RE.test(to) || from > to) throw new BadRequestException("Khoảng ngày không hợp lệ");
    const start = new Date(new Date(`${from}T00:00:00Z`).getTime() - VN);
    const end = new Date(new Date(`${to}T00:00:00Z`).getTime() - VN + 86_400_000);
    if (end.getTime() - start.getTime() > 400 * 86_400_000) throw new BadRequestException("Tối đa 400 ngày");

    // Kỳ trước cùng độ dài — để so sánh
    const span = end.getTime() - start.getTime();
    const prevStart = new Date(start.getTime() - span);

    const [orders, prev, sessions, bookings, newCustomers] = await Promise.all([
      this.prisma.storeOrder.findMany({
        where: { storeId, createdAt: { gte: start, lt: end } },
        select: { id: true, status: true, source: true, paymentMethod: true, totalAmount: true, discountAmount: true, createdAt: true, customerId: true, items: { select: { productId: true, productName: true, quantity: true, lineTotal: true } } },
      }),
      this.prisma.storeOrder.aggregate({ where: { storeId, status: "completed", createdAt: { gte: prevStart, lt: start } }, _sum: { totalAmount: true }, _count: { _all: true } }),
      this.prisma.storeTableSession.findMany({
        where: { storeId, status: "closed", endedAt: { gte: start, lt: end } },
        select: { tableId: true, timeCharge: true, total: true, startedAt: true, endedAt: true, table: { select: { name: true, kind: true } } },
      }),
      this.prisma.storeBooking.groupBy({ by: ["status"], where: { storeId, bookingDate: { gte: start, lt: end } }, _count: { _all: true } }),
      this.prisma.storeCustomer.count({ where: { storeId, createdAt: { gte: start, lt: end } } }),
    ]);

    const done = orders.filter((o) => o.status === "completed");
    const revenue = done.reduce((s, o) => s + o.totalAmount, 0);

    // Theo ngày
    const byDayMap = new Map<string, { revenue: number; orders: number }>();
    for (let t = start.getTime(); t < end.getTime(); t += 86_400_000) byDayMap.set(vnDay(new Date(t)), { revenue: 0, orders: 0 });
    for (const o of done) {
      const d = byDayMap.get(vnDay(o.createdAt));
      if (d) {
        d.revenue += o.totalAmount;
        d.orders++;
      }
    }
    // Theo giờ trong ngày (giờ cao điểm)
    const byHour = Array.from({ length: 24 }, (_, h) => ({ hour: h, revenue: 0, orders: 0 }));
    for (const o of done) {
      const h = byHour[vnHour(o.createdAt)];
      h.revenue += o.totalAmount;
      h.orders++;
    }

    const group = <K extends string>(key: (o: (typeof done)[number]) => K) => {
      const m = new Map<K, { key: K; revenue: number; orders: number }>();
      for (const o of done) {
        const k = key(o);
        const g = m.get(k) ?? { key: k, revenue: 0, orders: 0 };
        g.revenue += o.totalAmount;
        g.orders++;
        m.set(k, g);
      }
      return [...m.values()].sort((a, b) => b.revenue - a.revenue);
    };

    // Sản phẩm bán chạy (gộp theo tên; dòng tiền giờ bàn tách riêng)
    const prod = new Map<string, { name: string; productId: string | null; quantity: number; revenue: number }>();
    let timeRevenue = 0;
    for (const o of done) {
      for (const i of o.items) {
        if (!i.productId && /^Giờ /.test(i.productName)) {
          timeRevenue += i.lineTotal;
          continue;
        }
        const k = i.productId ?? `name:${i.productName}`;
        const g = prod.get(k) ?? { name: i.productName, productId: i.productId, quantity: 0, revenue: 0 };
        g.quantity += i.quantity;
        g.revenue += i.lineTotal;
        prod.set(k, g);
      }
    }

    // Bàn / phòng
    const tableMap = new Map<string, { tableId: string; name: string; kind: string; sessions: number; minutes: number; revenue: number; timeRevenue: number }>();
    for (const s of sessions) {
      const g = tableMap.get(s.tableId) ?? { tableId: s.tableId, name: s.table.name, kind: s.table.kind, sessions: 0, minutes: 0, revenue: 0, timeRevenue: 0 };
      g.sessions++;
      g.minutes += s.endedAt ? Math.round((s.endedAt.getTime() - s.startedAt.getTime()) / 60_000) : 0;
      g.revenue += s.total;
      g.timeRevenue += s.timeCharge;
      tableMap.set(s.tableId, g);
    }

    const cancelled = orders.filter((o) => o.status === "cancelled");
    const pending = orders.filter((o) => o.status !== "completed" && o.status !== "cancelled");
    return {
      from,
      to,
      summary: {
        revenue,
        orders: done.length,
        avgOrder: done.length ? Math.round(revenue / done.length) : 0,
        discount: done.reduce((s, o) => s + o.discountAmount, 0),
        customers: new Set(done.map((o) => o.customerId).filter(Boolean)).size,
        newCustomers,
        timeRevenue,
        pendingOrders: pending.length,
        pendingAmount: pending.reduce((s, o) => s + o.totalAmount, 0),
        cancelledOrders: cancelled.length,
        cancelledAmount: cancelled.reduce((s, o) => s + o.totalAmount, 0),
        prevRevenue: prev._sum.totalAmount ?? 0,
        prevOrders: prev._count._all,
      },
      byDay: [...byDayMap.entries()].map(([date, v]) => ({ date, ...v })),
      byHour,
      bySource: group((o) => o.source),
      byPayment: group((o) => o.paymentMethod),
      topProducts: [...prod.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 15),
      tables: [...tableMap.values()].sort((a, b) => b.revenue - a.revenue),
      bookings: Object.fromEntries(bookings.map((b) => [b.status, b._count._all])),
    };
  }
}
