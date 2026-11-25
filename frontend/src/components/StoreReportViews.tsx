import { App as AntApp, Empty, Segmented, Spin, Table, Tooltip } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useEffect, useState } from "react";
import { LuReceipt, LuShoppingBag, LuTrendingDown, LuTrendingUp, LuUsers } from "react-icons/lu";
import { ApiError } from "../data/platform-api";
import { fetchReport, type RevenueReport } from "../data/pos-api";
import type { StoreConfig } from "../data/store-api";
import { TABLE_KIND } from "./StorePosViews";
import { FilterBar, FilterRange, PageHeader, StatCard, StatGrid } from "./ui";

const money = (n: number) => `${n.toLocaleString("vi-VN")}đ`;
/** 1,2tr / 850k — nhãn trục gọn */
const short = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}tr` : n >= 1000 ? `${Math.round(n / 1000)}k` : String(n));
const SOURCE: Record<string, string> = { miniapp: "Mini App", admin: "Tạo tại quầy (web)", pos: "Bán hàng tại bàn" };
const PAYMENT: Record<string, string> = { cod: "Thu khi giao (COD)", cash: "Tiền mặt", bank_transfer: "Chuyển khoản", card: "Thẻ", ewallet: "Ví điện tử" };
const BAR = "#1657f3"; // màu thương hiệu — 1 chuỗi số liệu, không cần chú thích

const PRESETS: Record<string, () => [Dayjs, Dayjs]> = {
  today: () => [dayjs(), dayjs()],
  "7d": () => [dayjs().subtract(6, "day"), dayjs()],
  "30d": () => [dayjs().subtract(29, "day"), dayjs()],
  month: () => [dayjs().startOf("month"), dayjs()],
  lastMonth: () => [dayjs().subtract(1, "month").startOf("month"), dayjs().subtract(1, "month").endOf("month")],
};

/** Cột dọc 1 chuỗi: thanh mảnh, bo 4px đầu thanh, khe 2px, lưới mờ, tooltip từng cột */
function Bars({ data, label, height = 180 }: { data: { key: string; value: number; tip: React.ReactNode }[]; label: (k: string, i: number) => string | null; height?: number }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const ticks = [max, max / 2];
  return (
    <div className="relative" style={{ height: height + 22 }}>
      {/* lưới ngang */}
      {ticks.map((t) => (
        <div key={t} className="pointer-events-none absolute left-0 right-0 border-t border-dashed border-slate-200" style={{ top: height - (t / max) * height }}>
          <span className="absolute -top-2 right-0 bg-white pl-1 text-2xs tabular-nums text-slate-400">{short(Math.round(t))}</span>
        </div>
      ))}
      <div className="absolute left-0 right-8 top-0 flex items-end gap-[2px] border-b border-slate-300" style={{ height }}>
        {data.map((d) => (
          <Tooltip key={d.key} title={d.tip} mouseEnterDelay={0}>
            <div className="group flex h-full min-w-0 flex-1 cursor-default items-end">
              <div
                className="mx-auto w-full max-w-[40px] rounded-t-[4px] transition-opacity group-hover:opacity-80"
                style={{ height: d.value ? Math.max(2, (d.value / max) * height) : 0, background: BAR }}
              />
            </div>
          </Tooltip>
        ))}
      </div>
      <div className="absolute left-0 right-8 flex gap-[2px]" style={{ top: height + 4 }}>
        {data.map((d, i) => (
          <div key={d.key} className="min-w-0 flex-1 overflow-visible whitespace-nowrap text-center text-2xs text-slate-400">
            {label(d.key, i)}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Thanh tỉ trọng ngang trong bảng */
const Share = ({ value, total }: { value: number; total: number }) => {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 rounded-full bg-slate-100">
        <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: BAR }} />
      </div>
      <span className="w-9 text-right text-xs tabular-nums text-slate-500">{pct}%</span>
    </div>
  );
};

/**
 * Báo cáo doanh thu (tách khỏi Tổng quan để nhân viên đứng quầy không thấy).
 * Doanh thu = đơn đã hoàn thành trong kỳ; so với kỳ trước cùng độ dài.
 */
export function ReportsSection({ store }: { store: StoreConfig }) {
  const { message } = AntApp.useApp();
  const [preset, setPreset] = useState("7d");
  const [range, setRange] = useState<[Dayjs, Dayjs]>(PRESETS["7d"]());
  const [r, setR] = useState<RevenueReport | null>(null);
  const [loading, setLoading] = useState(false);
  const from = range[0].format("YYYY-MM-DD");
  const to = range[1].format("YYYY-MM-DD");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchReport(store.id, from, to)
      .then((d) => alive && setR(d))
      .catch((e) => message.error(e instanceof ApiError ? e.message : "Không tải được báo cáo"))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [store.id, from, to, message]);

  const s = r?.summary;
  const delta = s && s.prevRevenue ? Math.round(((s.revenue - s.prevRevenue) / s.prevRevenue) * 100) : null;
  const days = r?.byDay ?? [];
  const every = days.length > 20 ? Math.ceil(days.length / 10) : 1;
  const hours = (r?.byHour ?? []).filter((h) => h.hour >= 6);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <PageHeader title="Báo cáo" description="Doanh thu từ đơn đã hoàn thành (Mini App, tạo tại quầy, bán hàng tại bàn). Chỉ chủ cửa hàng nên xem trang này." />
        <FilterBar
          className="!mb-0"
          filters={
            <>
              <Segmented
                value={preset}
                onChange={(v) => {
                  setPreset(String(v));
                  setRange(PRESETS[String(v)]());
                }}
                options={[
                  { value: "today", label: "Hôm nay" },
                  { value: "7d", label: "7 ngày" },
                  { value: "30d", label: "30 ngày" },
                  { value: "month", label: "Tháng này" },
                  { value: "lastMonth", label: "Tháng trước" },
                ]}
              />
              <FilterRange
                allowClear={false}
                value={range}
                format="DD/MM/YYYY"
                disabledDate={(d) => d.isAfter(dayjs(), "day")}
                onChange={(v) => {
                  if (v?.[0] && v[1]) {
                    setRange([v[0], v[1]]);
                    setPreset("");
                  }
                }}
              />
            </>
          }
          actions={loading ? <Spin size="small" /> : null}
        />
      </div>

      {!r || !s ? (
        <div className="py-16 text-center">
          <Spin />
        </div>
      ) : (
        <>
          <StatGrid>
            <StatCard
              label="Doanh thu"
              icon={delta != null && delta < 0 ? <LuTrendingDown size={16} className="text-red-500" /> : <LuTrendingUp size={16} className="text-emerald-600" />}
              value={money(s.revenue)}
              hint={delta == null ? "Kỳ trước chưa có doanh thu" : `${delta >= 0 ? "+" : ""}${delta}% so với kỳ trước (${money(s.prevRevenue)})`}
            />
            <StatCard label="Đơn hoàn thành" icon={<LuShoppingBag size={16} className="text-brand-600" />} value={s.orders} hint={`TB ${money(s.avgOrder)} / đơn`} />
            <StatCard label="Khách mua" icon={<LuUsers size={16} className="text-sky-600" />} value={s.customers} hint={`${s.newCustomers} khách mới trong kỳ`} />
            <StatCard label="Tiền giờ bàn / phòng" icon={<LuReceipt size={16} className="text-amber-600" />} value={money(s.timeRevenue)} hint={`Đã giảm giá ${money(s.discount)}`} />
          </StatGrid>
          <div className="flex flex-wrap gap-x-6 gap-y-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs text-slate-600">
            <span>
              Đơn chưa hoàn thành: <b className="tabular-nums text-slate-900">{s.pendingOrders}</b> ({money(s.pendingAmount)})
            </span>
            <span>
              Đơn huỷ: <b className="tabular-nums text-red-600">{s.cancelledOrders}</b> ({money(s.cancelledAmount)})
            </span>
            <span>
              Lịch hẹn: {r.bookings.completed ?? 0} hoàn thành · {r.bookings.cancelled ?? 0} huỷ ·{" "}
              {(r.bookings.pending ?? 0) + (r.bookings.confirmed ?? 0)} chờ
            </span>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4 lg:col-span-2">
              <div className="mb-3 text-sm font-semibold text-slate-900">Doanh thu theo ngày</div>
              {s.revenue ? (
                <Bars
                  data={days.map((d) => ({
                    key: d.date,
                    value: d.revenue,
                    tip: (
                      <div className="text-xs">
                        <div className="font-semibold">{dayjs(d.date).format("ddd DD/MM")}</div>
                        <div className="tabular-nums">{money(d.revenue)}</div>
                        <div className="opacity-75">{d.orders} đơn</div>
                      </div>
                    ),
                  }))}
                  label={(k, i) => (i % every === 0 ? dayjs(k).format("DD/MM") : null)}
                />
              ) : (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có doanh thu trong kỳ" />
              )}
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-3 text-sm font-semibold text-slate-900">Giờ cao điểm</div>
              {s.revenue ? (
                <Bars
                  height={150}
                  data={hours.map((h) => ({
                    key: String(h.hour),
                    value: h.revenue,
                    tip: (
                      <div className="text-xs">
                        <div className="font-semibold">
                          {h.hour}:00–{h.hour + 1}:00
                        </div>
                        <div className="tabular-nums">{money(h.revenue)}</div>
                        <div className="opacity-75">{h.orders} đơn</div>
                      </div>
                    ),
                  }))}
                  label={(k) => (Number(k) % 3 === 0 ? `${k}h` : null)}
                />
              ) : (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="—" />
              )}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-2 text-sm font-semibold text-slate-900">Theo kênh bán</div>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={r.bySource}
                columns={[
                  { title: "Kênh", render: (_, x) => SOURCE[x.key] ?? x.key },
                  { title: "Đơn", dataIndex: "orders", align: "right", width: 60, className: "tabular-nums" },
                  { title: "Doanh thu", align: "right", width: 120, render: (_, x) => <span className="tabular-nums">{money(x.revenue)}</span> },
                  { title: "Tỉ trọng", width: 140, render: (_, x) => <Share value={x.revenue} total={s.revenue} /> },
                ]}
              />
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-2 text-sm font-semibold text-slate-900">Theo hình thức thanh toán</div>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={r.byPayment}
                columns={[
                  { title: "Hình thức", render: (_, x) => PAYMENT[x.key] ?? x.key },
                  { title: "Đơn", dataIndex: "orders", align: "right", width: 60, className: "tabular-nums" },
                  { title: "Doanh thu", align: "right", width: 120, render: (_, x) => <span className="tabular-nums">{money(x.revenue)}</span> },
                  { title: "Tỉ trọng", width: 140, render: (_, x) => <Share value={x.revenue} total={s.revenue} /> },
                ]}
              />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-2 text-sm font-semibold text-slate-900">Sản phẩm / dịch vụ bán chạy</div>
              <Table
                rowKey={(x) => x.productId ?? x.name}
                size="small"
                pagination={false}
                dataSource={r.topProducts}
                locale={{ emptyText: "Chưa có" }}
                columns={[
                  { title: "#", width: 36, render: (_, __, i) => <span className="text-slate-400">{i + 1}</span> },
                  { title: "Tên", dataIndex: "name", ellipsis: true },
                  { title: "SL", dataIndex: "quantity", align: "right", width: 56, className: "tabular-nums" },
                  { title: "Doanh thu", align: "right", width: 120, render: (_, x) => <span className="tabular-nums">{money(x.revenue)}</span> },
                ]}
              />
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-2 text-sm font-semibold text-slate-900">Bàn / phòng</div>
              <Table
                rowKey="tableId"
                size="small"
                pagination={{ pageSize: 10, hideOnSinglePage: true, showSizeChanger: false }}
                dataSource={r.tables}
                locale={{ emptyText: "Chưa có lượt bán tại bàn" }}
                columns={[
                  { title: "Bàn", render: (_, x) => <span className="font-medium">{x.name}</span> },
                  { title: "Loại", width: 110, render: (_, x) => TABLE_KIND[x.kind as keyof typeof TABLE_KIND]?.label ?? x.kind },
                  { title: "Lượt", dataIndex: "sessions", align: "right", width: 56, className: "tabular-nums" },
                  {
                    title: "Giờ dùng",
                    align: "right",
                    width: 80,
                    render: (_, x) => <span className="tabular-nums">{Math.floor(x.minutes / 60)}h{String(x.minutes % 60).padStart(2, "0")}</span>,
                  },
                  { title: "Doanh thu", align: "right", width: 110, render: (_, x) => <span className="tabular-nums">{money(x.revenue)}</span> },
                ]}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
