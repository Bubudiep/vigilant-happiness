import {
  App as AntApp,
  Button,
  Drawer,
  Empty,
  Form,
  Grid,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Segmented,
  Select,
  Spin,
  Switch,
  Table,
  Tabs,
  Tag,
  Tooltip,
} from "antd";
import dayjs from "dayjs";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  LuArmchair,
  LuArrowRightLeft,
  LuCircleDot,
  LuClock,
  LuDoorOpen,
  LuMic,
  LuMinus,
  LuPlus,
  LuRefreshCw,
  LuSearch,
  LuSettings2,
  LuSparkles,
  LuTrash2,
  LuUserPlus,
  LuUsers,
} from "react-icons/lu";
import { ApiError } from "../data/platform-api";
import {
  cancelSession,
  checkoutSession,
  createArea,
  createTable,
  createTablesBulk,
  deleteArea,
  deleteTable,
  fetchPos,
  moveSession,
  openTable,
  type PosArea,
  type PosItem,
  type PosOverview,
  type PosSession,
  type PosTable,
  type TableKind,
  timeCharge,
  updateArea,
  updateSession,
  updateTable,
} from "../data/pos-api";
import { addStoreCustomer, type PaymentMethod, type StoreConfig, type StoreCustomerItem, type StoreProductItem } from "../data/store-api";
import { OptionPickerModal } from "./StoreInventoryViews";
import { FilterBar, FORM_PROPS, FormFooter, FormGrid, PageHeader } from "./ui";

// ───────────────────────── hằng số ─────────────────────────

export const TABLE_KIND: Record<TableKind, { label: string; icon: ReactNode; preset: Partial<PosTable> }> = {
  table: { label: "Bàn", icon: <LuArmchair size={14} />, preset: { pricePerHour: 0, blockMinutes: 30, minMinutes: 0, seats: 4 } },
  billiards: { label: "Bàn bida", icon: <LuCircleDot size={14} />, preset: { pricePerHour: 60_000, blockMinutes: 30, minMinutes: 30, seats: 4 } },
  karaoke: { label: "Phòng karaoke", icon: <LuMic size={14} />, preset: { pricePerHour: 150_000, blockMinutes: 30, minMinutes: 60, seats: 8 } },
  room: { label: "Phòng", icon: <LuDoorOpen size={14} />, preset: { pricePerHour: 100_000, blockMinutes: 30, minMinutes: 60, seats: 10 } },
  other: { label: "Khác", icon: <LuSparkles size={14} />, preset: { pricePerHour: 0, blockMinutes: 30, minMinutes: 0 } },
};
const PAYMENTS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Tiền mặt" },
  { value: "bank_transfer", label: "Chuyển khoản" },
  { value: "ewallet", label: "Ví điện tử" },
  { value: "card", label: "Thẻ" },
];
const BLOCKS = [1, 5, 10, 15, 30, 60].map((v) => ({ value: v, label: v === 1 ? "Theo phút" : `Block ${v} phút` }));

const money = (n: number) => `${n.toLocaleString("vi-VN")}đ`;
const dur = (m: number) => (m < 60 ? `${m}′` : `${Math.floor(m / 60)}h${m % 60 ? String(m % 60).padStart(2, "0") : ""}`);
const errMsg = (e: unknown, fb = "Thao tác thất bại") => (e instanceof ApiError ? e.message : fb);
const priceText = (t: Pick<PosTable, "pricePerHour" | "blockMinutes" | "minMinutes">) =>
  t.pricePerHour
    ? `${money(t.pricePerHour)}/giờ · ${t.blockMinutes === 1 ? "theo phút" : `block ${t.blockMinutes}′`}${t.minMinutes ? ` · tối thiểu ${dur(t.minMinutes)}` : ""}`
    : "Không tính giờ";

type Status = "free" | "busy" | "reserved" | "cleaning";
const STATUS: Record<Status, { label: string; dot: string }> = {
  free: { label: "Trống", dot: "bg-emerald-500" },
  busy: { label: "Đang dùng", dot: "bg-brand-600" },
  reserved: { label: "Đặt trước", dot: "bg-amber-500" },
  cleaning: { label: "Đang dọn", dot: "bg-slate-400" },
};

/** Đồng hồ dùng chung: cập nhật mỗi 15 giây để tiền giờ chạy trên màn hình */
function useNow(ms = 15_000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), ms);
    return () => window.clearInterval(t);
  }, [ms]);
  return now;
}

const sessionTotal = (s: PosSession, now: Date) => {
  const t = timeCharge(s.startedAt, now, s.pricePerHour, s.blockMinutes, s.minMinutes);
  const items = s.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  return { ...t, items, total: Math.max(0, items + t.charge - s.discount) };
};

// ───────────────────────── trang Bán hàng ─────────────────────────

/**
 * Bán hàng tại quầy: sơ đồ bàn / phòng theo khu vực (tầng), mở bàn, gọi món, tính giờ (bida, karaoke…),
 * chuyển bàn, thanh toán → tạo đơn nguồn "Bán tại quầy" (vào Báo cáo, cộng điểm khách).
 */
export function PosSection({
  store,
  onCheckout,
  onLocal,
}: {
  store: StoreConfig;
  onCheckout?: () => void;
  /** Cập nhật danh sách trên giao diện (VD khách mới tạo nhanh) */
  onLocal?: (updater: (s: StoreConfig) => StoreConfig) => void;
}) {
  const addCustomer = (c: StoreCustomerItem) => onLocal?.((s) => ({ ...s, customers: [c, ...s.customers] }));
  const { message } = AntApp.useApp();
  const now = useNow();
  const [data, setData] = useState<PosOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [area, setArea] = useState<string>("all");
  const [filter, setFilter] = useState<string>("all");
  const [openFor, setOpenFor] = useState<PosTable | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [setup, setSetup] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchPos(store.id));
    } catch (e) {
      message.error(errMsg(e, "Không tải được sơ đồ bàn"));
    } finally {
      setLoading(false);
    }
  }, [store.id, message]);
  useEffect(() => {
    load();
    // Nhiều máy cùng bán: tải lại mỗi 30 giây
    const t = window.setInterval(() => document.visibilityState === "visible" && fetchPos(store.id).then(setData).catch(() => undefined), 30_000);
    return () => window.clearInterval(t);
  }, [load, store.id]);

  const sessionByTable = useMemo(() => new Map((data?.sessions ?? []).map((s) => [s.tableId, s])), [data]);
  const statusOf = (t: PosTable): Status => (sessionByTable.has(t.id) ? "busy" : t.state === "reserved" ? "reserved" : t.state === "cleaning" ? "cleaning" : "free");
  const tables = (data?.tables ?? []).filter((t) => t.active);
  const counts = (list: PosTable[]) => {
    const c = { free: 0, busy: 0, reserved: 0, cleaning: 0 } as Record<Status, number>;
    for (const t of list) c[statusOf(t)]++;
    return c;
  };
  const all = counts(tables);
  const running = (data?.sessions ?? []).reduce((sum, s) => sum + sessionTotal(s, now).total, 0);

  const patchSession = (s: PosSession) => setData((d) => (d ? { ...d, sessions: d.sessions.map((x) => (x.id === s.id ? s : x)) } : d));
  const removeSession = (id: string) => setData((d) => (d ? { ...d, sessions: d.sessions.filter((x) => x.id !== id) } : d));
  const patchTable = (t: PosTable) => setData((d) => (d ? { ...d, tables: d.tables.map((x) => (x.id === t.id ? t : x)) } : d));

  const clickTable = (t: PosTable) => {
    const s = sessionByTable.get(t.id);
    if (s) setSessionId(s.id);
    else setOpenFor(t);
  };

  const finishCleaning = async (t: PosTable) => {
    try {
      patchTable(await updateTable(store.id, t.id, { state: "ready", stateNote: null }));
    } catch (e) {
      message.error(errMsg(e));
    }
  };

  const areas: (PosArea | { id: null; name: string })[] = [
    ...(data?.areas ?? []),
    ...(tables.some((t) => !t.areaId || !(data?.areas ?? []).some((a) => a.id === t.areaId)) ? [{ id: null, name: "Chưa xếp khu" }] : []),
  ];
  const inArea = (a: { id: string | null }) =>
    tables.filter((t) => (a.id ? t.areaId === a.id : !t.areaId || !(data?.areas ?? []).some((x) => x.id === t.areaId)));
  const visibleAreas = area === "all" ? areas : areas.filter((a) => (a.id ?? "none") === area);
  const session = sessionId ? (data?.sessions.find((s) => s.id === sessionId) ?? null) : null;

  if (!data)
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spin />
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <PageHeader
          title="Bán hàng"
          description="Sơ đồ bàn / phòng theo tầng. Bấm bàn trống để mở bàn, bấm bàn đang dùng để gọi món, tính giờ và thanh toán."
        />
        <FilterBar
          filters={
            <>
              <Segmented
                value={area}
                onChange={(v) => setArea(String(v))}
                options={[
                  { value: "all", label: `Tất cả (${tables.length})` },
                  ...areas.map((a) => {
                    const c = counts(inArea(a));
                    return { value: a.id ?? "none", label: `${a.name} · ${c.busy}/${inArea(a).length}` };
                  }),
                ]}
              />
              <Segmented
                value={filter}
                onChange={(v) => setFilter(String(v))}
                options={[
                  { value: "all", label: "Mọi trạng thái" },
                  ...(Object.keys(STATUS) as Status[]).map((k) => ({
                    value: k,
                    label: (
                      <span className="inline-flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${STATUS[k].dot}`} />
                        {STATUS[k].label} {all[k]}
                      </span>
                    ),
                  })),
                ]}
              />
            </>
          }
          actions={
            <>
              <Tooltip title="Tổng tạm tính các bàn đang mở">
                <span className="text-xs text-slate-500">
                  Đang mở <b className="tabular-nums text-slate-900">{money(running)}</b>
                </span>
              </Tooltip>
              <Button icon={<LuRefreshCw size={14} />} loading={loading} onClick={load} aria-label="Làm mới" />
              <Button icon={<LuSettings2 size={14} />} onClick={() => setSetup(true)}>
                Thiết lập bàn
              </Button>
            </>
          }
        />

        {tables.length === 0 ? (
          <Empty description="Chưa có bàn / phòng nào">
            <Button type="primary" icon={<LuPlus size={14} />} onClick={() => setSetup(true)}>
              Thiết lập khu vực & bàn
            </Button>
          </Empty>
        ) : (
          <div className="space-y-5">
            {visibleAreas.map((a) => {
              const list = inArea(a).filter((t) => filter === "all" || statusOf(t) === filter);
              if (!list.length) return null;
              const c = counts(inArea(a));
              return (
                <section key={a.id ?? "none"}>
                  <div className="mb-2 flex items-baseline gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">{a.name}</h3>
                    <span className="text-xs text-slate-500">
                      {c.free} trống · {c.busy} đang dùng{c.reserved ? ` · ${c.reserved} đặt trước` : ""}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                    {list.map((t) => (
                      <TableCard key={t.id} table={t} status={statusOf(t)} session={sessionByTable.get(t.id)} now={now} onClick={() => clickTable(t)} onCleaned={() => finishCleaning(t)} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>

      <OpenTableModal
        store={store}
        onCustomerCreated={addCustomer}
        table={openFor}
        onClose={() => setOpenFor(null)}
        onOpened={(s) => {
          setData((d) => (d ? { ...d, sessions: [...d.sessions, s], tables: d.tables.map((x) => (x.id === s.tableId ? { ...x, state: "ready", stateNote: null } : x)) } : d));
          setOpenFor(null);
          setSessionId(s.id);
        }}
        onTableChange={patchTable}
      />

      <SessionDrawer
        store={store}
        onCustomerCreated={addCustomer}
        session={session}
        table={session ? (data.tables.find((t) => t.id === session.tableId) ?? null) : null}
        freeTables={tables.filter((t) => statusOf(t) !== "busy")}
        now={now}
        onClose={() => setSessionId(null)}
        onChange={patchSession}
        onClosed={(id, cleaningTableId) => {
          removeSession(id);
          if (cleaningTableId) setData((d) => (d ? { ...d, tables: d.tables.map((x) => (x.id === cleaningTableId ? { ...x, state: "cleaning" } : x)) } : d));
          setSessionId(null);
        }}
        onCheckout={onCheckout}
      />

      <SetupDrawer store={store} open={setup} data={data} onClose={() => setSetup(false)} onData={setData} reload={load} />
    </div>
  );
}

// ───────────────────────── thẻ bàn ─────────────────────────

function TableCard({
  table,
  status,
  session,
  now,
  onClick,
  onCleaned,
}: {
  table: PosTable;
  status: Status;
  session?: PosSession;
  now: Date;
  onClick: () => void;
  onCleaned: () => void;
}) {
  const k = TABLE_KIND[table.kind] ?? TABLE_KIND.other;
  const t = session ? sessionTotal(session, now) : null;
  const tone = {
    free: "border-emerald-200 bg-white hover:border-emerald-400 hover:shadow-sm",
    busy: "border-brand-300 bg-brand-50 hover:border-brand-500 hover:shadow-sm",
    reserved: "border-amber-300 bg-amber-50 hover:border-amber-500",
    cleaning: "border-slate-200 bg-slate-50 text-slate-500",
  }[status];
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onClick()}
      className={`relative flex min-h-[104px] cursor-pointer flex-col rounded-xl border p-2.5 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ${tone}`}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0">
          <div className="truncate text-sm font-bold text-slate-900">{table.name}</div>
          <div className="flex items-center gap-1 text-xs text-slate-500">
            {k.icon}
            <span className="truncate">
              {k.label}
              {table.seats ? ` · ${table.seats} chỗ` : ""}
            </span>
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 text-2xs font-semibold text-slate-600">
          <span className={`h-2 w-2 rounded-full ${STATUS[status].dot}`} />
          {STATUS[status].label}
        </span>
      </div>
      <div className="mt-auto pt-2">
        {session && t ? (
          <>
            <div className="flex items-center justify-between gap-1 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1 tabular-nums">
                <LuClock size={12} /> {dayjs(session.startedAt).format("HH:mm")} · {dur(t.minutes)}
              </span>
              {session.guestCount ? (
                <span className="inline-flex items-center gap-0.5">
                  <LuUsers size={12} /> {session.guestCount}
                </span>
              ) : null}
            </div>
            <div className="flex items-baseline justify-between gap-1">
              <span className="truncate text-xs text-slate-500">
                {session.customerName || `${session.items.reduce((n, i) => n + i.quantity, 0)} món`}
              </span>
              <span className="text-sm font-bold tabular-nums text-brand-700">{money(t.total)}</span>
            </div>
          </>
        ) : status === "reserved" ? (
          <div className="truncate text-xs text-amber-700">{table.stateNote || "Đã có khách đặt"}</div>
        ) : status === "cleaning" ? (
          <Button
            size="small"
            block
            onClick={(e) => {
              e.stopPropagation();
              onCleaned();
            }}
          >
            Dọn xong
          </Button>
        ) : (
          <div className="truncate text-xs text-slate-400">{table.pricePerHour ? `${money(table.pricePerHour)}/giờ` : "Bấm để mở bàn"}</div>
        )}
      </div>
    </div>
  );
}

// ───────────────────────── mở bàn / đặt trước ─────────────────────────

function OpenTableModal({
  store,
  table,
  onClose,
  onOpened,
  onTableChange,
  onCustomerCreated,
}: {
  store: StoreConfig;
  onCustomerCreated: (c: StoreCustomerItem) => void;
  table: PosTable | null;
  onClose: () => void;
  onOpened: (s: PosSession) => void;
  onTableChange: (t: PosTable) => void;
}) {
  const { message } = AntApp.useApp();
  const [form] = Form.useForm<{ guestCount?: number; customerId?: string; customerName?: string; note?: string; startedAt?: string }>();
  const [busy, setBusy] = useState(false);
  const [reserveNote, setReserveNote] = useState("");
  useEffect(() => {
    if (table) {
      form.resetFields();
      setReserveNote(table.stateNote ?? "");
    }
  }, [table, form]);

  const submit = async (v: { guestCount?: number; customerId?: string; customerName?: string; note?: string; startedAt?: string }) => {
    if (!table) return;
    setBusy(true);
    try {
      const startedAt = v.startedAt ? dayjs(`${dayjs().format("YYYY-MM-DD")}T${v.startedAt}`).toISOString() : undefined;
      onOpened(await openTable(store.id, table.id, { ...v, startedAt } as never));
      message.success(`Đã mở ${table.name}`);
    } catch (e) {
      message.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const setState = async (state: PosTable["state"]) => {
    if (!table) return;
    try {
      onTableChange(await updateTable(store.id, table.id, { state, stateNote: state === "reserved" ? reserveNote.trim() || null : null }));
      message.success(state === "reserved" ? `Đã đánh dấu ${table.name} đặt trước` : `${table.name} đã sẵn sàng`);
      onClose();
    } catch (e) {
      message.error(errMsg(e));
    }
  };

  const nowMin = dayjs().hour() * 60 + dayjs().minute();
  const pastTimes = Array.from({ length: 24 }, (_, i) => nowMin - (i + 1) * 5)
    .filter((m) => m >= 0)
    .map((m) => {
      const v = `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
      return { value: v, label: `${v} (${(nowMin - m)}′ trước)` };
    });

  return (
    <Modal open={!!table} title={table ? `Mở ${table.name}` : ""} onCancel={onClose} footer={null} destroyOnHidden width={460}>
      {table && (
        <Form form={form} {...FORM_PROPS} onFinish={submit} initialValues={{ guestCount: table.seats ? Math.min(2, table.seats) : 2 }}>
          <div className="-mt-1 mb-3 text-xs text-slate-500">
            {TABLE_KIND[table.kind]?.label} · {priceText(table)}
          </div>
          <FormGrid>
            <Form.Item label="Số khách" name="guestCount">
              <InputNumber className="!w-full" min={0} max={200} />
            </Form.Item>
            <Form.Item label="Bắt đầu lúc" name="startedAt" extra="Để trống = bây giờ">
              <Select allowClear placeholder="Bây giờ" options={pastTimes} />
            </Form.Item>
          </FormGrid>
          <Form.Item label="Khách hàng (tuỳ chọn — để tích điểm)" name="customerId">
            <CustomerPicker store={store} onCreated={onCustomerCreated} />
          </Form.Item>
          <Form.Item label="Ghi chú" name="note">
            <Input placeholder="VD: khách quen, sinh nhật…" />
          </Form.Item>
          <FormFooter>
            <Button type="primary" htmlType="submit" loading={busy} block>
              Mở bàn ngay
            </Button>
          </FormFooter>
          <div className="mt-4 border-t border-slate-100 pt-3">
            {table.state === "reserved" ? (
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="text-amber-700">Đặt trước: {table.stateNote || "—"}</span>
                <Button size="small" onClick={() => setState("ready")}>
                  Huỷ đặt trước
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Input size="small" placeholder="Tên khách · giờ đến (VD: Anh Nam · 19:00)" value={reserveNote} onChange={(e) => setReserveNote(e.target.value)} />
                <Button size="small" onClick={() => setState("reserved")}>
                  Đánh dấu đặt trước
                </Button>
              </div>
            )}
          </div>
        </Form>
      )}
    </Modal>
  );
}

// ───────────────────────── phiên: gọi món & thanh toán ─────────────────────────

function SessionDrawer({
  store,
  onCustomerCreated,
  session,
  table,
  freeTables,
  now,
  onClose,
  onChange,
  onClosed,
  onCheckout,
}: {
  store: StoreConfig;
  onCustomerCreated: (c: StoreCustomerItem) => void;
  session: PosSession | null;
  table: PosTable | null;
  freeTables: PosTable[];
  now: Date;
  onClose: () => void;
  onChange: (s: PosSession) => void;
  onClosed: (id: string, cleaningTableId?: string) => void;
  onCheckout?: () => void;
}) {
  const { message, modal } = AntApp.useApp();
  const wide = !!Grid.useBreakpoint().md;
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [pay, setPay] = useState<{ open: boolean; method: PaymentMethod }>({ open: false, method: "cash" });
  const [paying, setPaying] = useState<"pay" | "clean" | null>(null);
  const saveTimer = useRef<number>();

  const products = store.products.filter((p) => p.active && p.kind !== "material");
  const [optFor, setOptFor] = useState<StoreProductItem | null>(null);
  const cats = useMemo(() => [...new Set(products.map((p) => p.category).filter(Boolean))], [products]);
  const kw = q.trim().toLowerCase();
  const shown = products.filter((p) => (cat === "all" || p.category === cat) && (!kw || p.name.toLowerCase().includes(kw)));

  // Sửa món: cập nhật ngay, lưu sau 500ms (gộp nhiều lần bấm +/-)
  const setItems = (items: PosItem[]) => {
    if (!session) return;
    onChange({ ...session, items });
    window.clearTimeout(saveTimer.current);
    const id = session.id;
    saveTimer.current = window.setTimeout(async () => {
      try {
        onChange(await updateSession(store.id, id, { items }));
      } catch (e) {
        message.error(errMsg(e, "Không lưu được món"));
      }
    }, 500);
  };
  const add = (p: StoreProductItem) => {
    if (!session) return;
    // Món có size / topping → chọn tuỳ chọn trước
    if (p.options?.length) return setOptFor(p);
    pushItem({ productId: p.id, name: p.name, unitPrice: p.salePrice ?? p.price, quantity: 1 });
  };
  const pushItem = (item: PosItem) => {
    if (!session) return;
    const items = [...session.items];
    // Cùng món + cùng tuỳ chọn (cùng tên hiển thị) → cộng số lượng
    const i = items.findIndex((x) => x.productId === item.productId && x.name === item.name);
    if (i >= 0) items[i] = { ...items[i], quantity: items[i].quantity + 1 };
    else items.push(item);
    setItems(items);
  };
  const qty = (idx: number, d: number) => {
    if (!session) return;
    const items = session.items.map((x, i) => (i === idx ? { ...x, quantity: x.quantity + d } : x)).filter((x) => x.quantity > 0);
    setItems(items);
  };

  const patch = async (data: Parameters<typeof updateSession>[2]) => {
    if (!session) return;
    try {
      onChange(await updateSession(store.id, session.id, data));
    } catch (e) {
      message.error(errMsg(e));
    }
  };

  const move = async (tableId: string) => {
    if (!session) return;
    try {
      const s = await moveSession(store.id, session.id, tableId);
      onChange(s);
      message.success(`Đã chuyển sang ${freeTables.find((t) => t.id === tableId)?.name ?? "bàn mới"}`);
    } catch (e) {
      message.error(errMsg(e));
    }
  };

  const cancel = async () => {
    if (!session) return;
    try {
      await cancelSession(store.id, session.id);
      onClosed(session.id);
      message.success("Đã huỷ phiên");
    } catch (e) {
      message.error(errMsg(e));
    }
  };

  /**
   * Thu tiền: cleanNow = false → bàn chuyển "Đang dọn" (bấm "Dọn xong" sau);
   * cleanNow = true → "Thanh toán & dọn bàn": bàn trống ngay, nhận khách mới được luôn.
   */
  const checkout = async (cleanNow: boolean) => {
    if (!session || !table) return;
    window.clearTimeout(saveTimer.current);
    setPaying(cleanNow ? "clean" : "pay");
    try {
      await updateSession(store.id, session.id, { items: session.items });
      const r = await checkoutSession(store.id, session.id, { paymentMethod: pay.method, discount: session.discount, cleaning: !cleanNow });
      setPay((p) => ({ ...p, open: false }));
      onClosed(session.id, cleanNow ? undefined : table.id);
      onCheckout?.();
      modal.success({
        title: `Đã thanh toán ${table.name}`,
        content: `Đơn ${r.order.code} · ${money(r.order.total)}${cleanNow ? " · bàn đã trống" : " · bàn đang dọn"}`,
        okText: "Xong",
      });
    } catch (e) {
      message.error(errMsg(e));
    } finally {
      setPaying(null);
    }
  };

  const t = session ? sessionTotal(session, now) : null;

  const menu = (
    <div className="flex min-h-0 flex-col">
      <Input allowClear prefix={<LuSearch size={14} className="text-slate-400" />} placeholder="Tìm món / dịch vụ…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="no-scrollbar mt-2 flex gap-1 overflow-x-auto pb-1">
        {["all", ...cats].map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCat(c)}
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ring-1 transition ${cat === c ? "bg-brand-600 text-white ring-brand-600" : "bg-white text-slate-600 ring-slate-200 hover:ring-brand-300"}`}
          >
            {c === "all" ? "Tất cả" : c}
          </button>
        ))}
      </div>
      <div className="mt-2 grid min-h-0 flex-1 auto-rows-min grid-cols-2 gap-2 overflow-y-auto pr-1 lg:grid-cols-3">
        {shown.map((p) => {
          const inBill = (session?.items ?? []).filter((x) => x.productId === p.id).reduce((n, x) => n + x.quantity, 0);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => add(p)}
              className={`relative flex min-h-[64px] flex-col justify-between rounded-lg border p-2 text-left transition hover:border-brand-400 hover:shadow-sm ${inBill ? "border-brand-300 bg-brand-50" : "border-slate-200 bg-white"}`}
            >
              <span className="line-clamp-2 text-xs font-semibold text-slate-800">{p.name}</span>
              <span className="text-xs tabular-nums text-slate-500">{money(p.salePrice ?? p.price)}</span>
              {inBill > 0 && <span className="absolute right-1.5 top-1.5 rounded-full bg-brand-600 px-1.5 text-2xs font-bold text-white">{inBill}</span>}
            </button>
          );
        })}
        {!shown.length && <div className="col-span-full py-6 text-center text-xs text-slate-400">Không có món phù hợp</div>}
      </div>
    </div>
  );

  const bill = session && t && table && (
    <div className="flex min-h-0 flex-col">
      <div className="rounded-lg bg-slate-50 p-2.5 text-xs text-slate-600">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1">
            <LuClock size={12} /> Vào {dayjs(session.startedAt).format("HH:mm DD/MM")} · đã {dur(t.minutes)}
          </span>
          <span className="inline-flex items-center gap-1">
            <LuUsers size={12} />
            <InputNumber
              size="small"
              variant="borderless"
              min={0}
              max={200}
              value={session.guestCount ?? undefined}
              placeholder="—"
              className="!w-14"
              onChange={(v) => patch({ guestCount: v == null ? null : Number(v) })}
            />
          </span>
        </div>
        <div className="mt-1">
          <CustomerPicker
            store={store}
            size="small"
            placeholder="+ Gắn khách hàng (tích điểm)"
            value={session.customerId ?? undefined}
            onChange={(v) => patch({ customerId: v ?? null })}
            onCreated={onCustomerCreated}
          />
        </div>
      </div>

      <div className="mt-2 min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto">
        {session.pricePerHour > 0 && (
          <div className="flex items-center justify-between gap-2 py-2 text-xs">
            <div className="min-w-0">
              <div className="font-semibold text-slate-800">Tiền giờ · {dur(t.billedMinutes)}</div>
              <div className="text-slate-500">{priceText(session)}</div>
            </div>
            <span className="shrink-0 font-semibold tabular-nums text-slate-900">{money(t.charge)}</span>
          </div>
        )}
        {session.items.map((i, idx) => (
          <div key={`${i.productId}-${idx}`} className="flex items-center gap-2 py-1.5 text-xs">
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium text-slate-800">{i.name}</div>
              <div className="tabular-nums text-slate-500">{money(i.unitPrice)}</div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button size="small" icon={<LuMinus size={12} />} onClick={() => qty(idx, -1)} aria-label="Bớt" />
              <span className="w-6 text-center font-semibold tabular-nums">{i.quantity}</span>
              <Button size="small" icon={<LuPlus size={12} />} onClick={() => qty(idx, 1)} aria-label="Thêm" />
            </div>
            <span className="w-20 shrink-0 text-right font-semibold tabular-nums text-slate-900">{money(i.unitPrice * i.quantity)}</span>
          </div>
        ))}
        {!session.items.length && !session.pricePerHour && <div className="py-6 text-center text-xs text-slate-400">Chưa gọi món — chọn món bên {wide ? "trái" : "trên"}</div>}
      </div>

      <div className="mt-2 space-y-1.5 border-t border-slate-200 pt-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-slate-500">Tiền món</span>
          <span className="tabular-nums">{money(t.items)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-500">Giảm giá</span>
          <InputNumber
            size="small"
            min={0}
            step={5000}
            value={session.discount || undefined}
            placeholder="0"
            className="!w-28"
            formatter={(v) => (v ? Number(v).toLocaleString("vi-VN") : "")}
            parser={(v) => Number((v ?? "").replace(/\D/g, "")) as never}
            onChange={(v) => onChange({ ...session, discount: Number(v ?? 0) })}
            onBlur={() => patch({ discount: session.discount })}
          />
        </div>
        <div className="flex items-baseline justify-between pt-1">
          <span className="text-sm font-semibold text-slate-900">Tạm tính</span>
          <span className="text-lg font-bold tabular-nums text-brand-700">{money(t.total)}</span>
        </div>
        <div className="flex flex-wrap gap-1.5 pt-1">
          <Select
            size="small"
            placeholder={
              <span className="inline-flex items-center gap-1">
                <LuArrowRightLeft size={12} /> Chuyển bàn
              </span>
            }
            value={null}
            popupMatchSelectWidth={false}
            className="min-w-[120px] flex-1"
            onChange={(v) => v && move(v)}
            options={freeTables.filter((x) => x.id !== table.id).map((x) => ({ value: x.id, label: `${x.name}${x.pricePerHour !== session.pricePerHour ? ` · ${x.pricePerHour ? money(x.pricePerHour) + "/h" : "không tính giờ"}` : ""}` }))}
          />
          <Popconfirm title="Huỷ phiên này?" description="Không tạo đơn, món đã gọi bị bỏ." okText="Huỷ phiên" okButtonProps={{ danger: true }} cancelText="Không" onConfirm={cancel}>
            <Button size="small" danger icon={<LuTrash2 size={12} />}>
              Huỷ
            </Button>
          </Popconfirm>
        </div>
        <Button type="primary" size="large" block className="!mt-2" disabled={!t.items && !t.charge} onClick={() => setPay((p) => ({ ...p, open: true }))}>
          Thanh toán {money(t.total)}
        </Button>
      </div>
    </div>
  );

  return (
    <Drawer
      open={!!session}
      onClose={onClose}
      size={wide ? 820 : "100%"}
      title={
        table && (
          <span className="inline-flex items-center gap-2">
            {table.name}
            <Tag className="!m-0">{TABLE_KIND[table.kind]?.label}</Tag>
            {session?.note && <span className="text-xs font-normal text-slate-500">{session.note}</span>}
          </span>
        )
      }
      styles={{ body: { padding: 12, display: "flex", minHeight: 0 } }}
    >
      {session && (
        <div className={`flex min-h-0 w-full gap-3 ${wide ? "flex-row" : "flex-col overflow-y-auto"}`}>
          <div className={wide ? "flex min-h-0 min-w-0 flex-1 flex-col" : "max-h-[45vh] min-h-[260px] shrink-0"}>{menu}</div>
          <div className={wide ? "flex min-h-0 w-[330px] shrink-0 flex-col border-l border-slate-100 pl-3" : ""}>{bill}</div>
        </div>
      )}
      <OptionPickerModal
        product={optFor}
        onClose={() => setOptFor(null)}
        onPick={(selections, label, price) => {
          if (optFor) pushItem({ productId: optFor.id, name: label, unitPrice: price, quantity: 1, selections });
          setOptFor(null);
        }}
      />
      <Modal
        open={pay.open}
        title={`Thanh toán ${table?.name ?? ""}`}
        onCancel={() => setPay((p) => ({ ...p, open: false }))}
        footer={
          <div data-ui="PosPayFooter" className="grid grid-cols-2 gap-2">
            <Tooltip title="Thu tiền, bàn chuyển sang “Đang dọn” — bấm “Dọn xong” khi dọn xong">
              <Button block loading={paying === "pay"} disabled={!!paying} onClick={() => checkout(false)}>
                Thanh toán
              </Button>
            </Tooltip>
            <Tooltip title="Thu tiền và trả bàn trống ngay để nhận khách mới">
              <Button block type="primary" loading={paying === "clean"} disabled={!!paying} onClick={() => checkout(true)}>
                Thanh toán & dọn bàn
              </Button>
            </Tooltip>
          </div>
        }
        destroyOnHidden
        width={420}
      >
        {t && session && (
          <div className="space-y-3 text-xs">
            <div className="rounded-lg bg-slate-50 p-3">
              {t.charge > 0 && (
                <div className="flex justify-between">
                  <span>Tiền giờ ({dur(t.billedMinutes)})</span>
                  <span className="tabular-nums">{money(t.charge)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Tiền món ({session.items.reduce((n, i) => n + i.quantity, 0)})</span>
                <span className="tabular-nums">{money(t.items)}</span>
              </div>
              {session.discount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Giảm giá</span>
                  <span className="tabular-nums">−{money(session.discount)}</span>
                </div>
              )}
              <div className="mt-1 flex justify-between border-t border-slate-200 pt-1 text-sm font-bold">
                <span>Khách trả</span>
                <span className="tabular-nums text-brand-700">{money(t.total)}</span>
              </div>
              <div className="mt-1 text-slate-500">Tiền giờ chốt tại thời điểm bấm thanh toán.</div>
            </div>
            <div>
              <div className="mb-1 font-medium text-slate-700">Hình thức</div>
              <Segmented block value={pay.method} onChange={(v) => setPay((p) => ({ ...p, method: v as PaymentMethod }))} options={PAYMENTS} />
            </div>
          </div>
        )}
      </Modal>
    </Drawer>
  );
}

// ───────────────────────── thiết lập khu vực & bàn ─────────────────────────

type TableForm = Partial<PosTable> & { prefix?: string; from?: number; count?: number };

function SetupDrawer({
  store,
  open,
  data,
  onClose,
  onData,
  reload,
}: {
  store: StoreConfig;
  open: boolean;
  data: PosOverview;
  onClose: () => void;
  onData: (d: PosOverview) => void;
  reload: () => void;
}) {
  const { message } = AntApp.useApp();
  const [newArea, setNewArea] = useState("");
  const [edit, setEdit] = useState<{ mode: "one" | "bulk"; item?: PosTable } | null>(null);
  const [form] = Form.useForm<TableForm>();
  const kind = Form.useWatch("kind", form) as TableKind | undefined;
  const timed = (Form.useWatch("pricePerHour", form) ?? 0) > 0;

  const set = (patch: Partial<PosOverview>) => onData({ ...data, ...patch });
  const run = async (fn: () => Promise<void>) => {
    try {
      await fn();
    } catch (e) {
      message.error(errMsg(e));
    }
  };

  const addArea = () =>
    run(async () => {
      if (!newArea.trim()) return;
      const a = await createArea(store.id, { name: newArea.trim(), sortOrder: data.areas.length });
      set({ areas: [...data.areas, a] });
      setNewArea("");
    });

  const openEdit = (mode: "one" | "bulk", item?: PosTable) => {
    setEdit({ mode, item });
    form.resetFields();
    form.setFieldsValue(
      item ?? {
        kind: "table",
        areaId: data.areas[0]?.id ?? null,
        ...TABLE_KIND.table.preset,
        active: true,
        ...(mode === "bulk" ? { prefix: "B", from: data.tables.length + 1, count: 6 } : { name: `Bàn ${data.tables.length + 1}` }),
      },
    );
  };

  const save = (v: TableForm) =>
    run(async () => {
      const body: Partial<PosTable> = {
        areaId: v.areaId ?? null,
        kind: v.kind,
        seats: v.seats ?? null,
        pricePerHour: v.pricePerHour ?? 0,
        blockMinutes: v.blockMinutes ?? 30,
        minMinutes: v.minMinutes ?? 0,
        active: v.active ?? true,
      };
      if (edit?.mode === "bulk") {
        onData(await createTablesBulk(store.id, { ...body, prefix: v.prefix ?? "", from: v.from ?? 1, count: v.count ?? 1 }));
        message.success(`Đã thêm ${v.count} bàn`);
      } else if (edit?.item) {
        const t = await updateTable(store.id, edit.item.id, { ...body, name: v.name });
        set({ tables: data.tables.map((x) => (x.id === t.id ? t : x)) });
      } else {
        const t = await createTable(store.id, { ...body, name: v.name, sortOrder: data.tables.length });
        set({ tables: [...data.tables, t] });
      }
      setEdit(null);
    });

  const areaName = (id: string | null) => data.areas.find((a) => a.id === id)?.name ?? "Chưa xếp khu";

  return (
    <Drawer open={open} onClose={onClose} size={720} title="Thiết lập bàn / phòng" destroyOnHidden>
      <Tabs
        items={[
          {
            key: "tables",
            label: `Bàn / phòng (${data.tables.length})`,
            children: (
              <>
                <div className="mb-3 flex flex-wrap justify-end gap-2">
                  <Button onClick={() => openEdit("bulk")}>Thêm nhanh nhiều bàn</Button>
                  <Button type="primary" icon={<LuPlus size={14} />} onClick={() => openEdit("one")}>
                    Thêm bàn / phòng
                  </Button>
                </div>
                <Table<PosTable>
                  rowKey="id"
                  size="small"
                  dataSource={[...data.tables].sort((a, b) => areaName(a.areaId).localeCompare(areaName(b.areaId), "vi") || a.sortOrder - b.sortOrder)}
                  pagination={{ pageSize: 15, hideOnSinglePage: true, showSizeChanger: false }}
                  tableLayout="fixed"
                  scroll={{ x: 640 }}
                  columns={[
                    { title: "Tên", dataIndex: "name", width: 120, render: (v: string) => <span className="font-semibold">{v}</span> },
                    { title: "Khu vực", width: 120, render: (_, t) => <span className="truncate">{areaName(t.areaId)}</span> },
                    { title: "Loại", width: 120, render: (_, t) => TABLE_KIND[t.kind]?.label },
                    { title: "Giá", render: (_, t) => <span className="text-xs text-slate-600">{priceText(t)}</span> },
                    {
                      title: "Dùng",
                      width: 60,
                      render: (_, t) => (
                        <Switch
                          size="small"
                          checked={t.active}
                          onChange={(active) =>
                            run(async () => {
                              const x = await updateTable(store.id, t.id, { active });
                              set({ tables: data.tables.map((y) => (y.id === x.id ? x : y)) });
                            })
                          }
                        />
                      ),
                    },
                    {
                      title: "",
                      width: 92,
                      align: "right",
                      render: (_, t) => (
                        <div className="flex justify-end gap-1">
                          <Button size="small" onClick={() => openEdit("one", t)}>
                            Sửa
                          </Button>
                          <Popconfirm
                            title={`Xoá ${t.name}?`}
                            okText="Xoá"
                            okButtonProps={{ danger: true }}
                            cancelText="Huỷ"
                            onConfirm={() =>
                              run(async () => {
                                await deleteTable(store.id, t.id);
                                set({ tables: data.tables.filter((x) => x.id !== t.id) });
                              })
                            }
                          >
                            <Button size="small" danger icon={<LuTrash2 size={12} />} />
                          </Popconfirm>
                        </div>
                      ),
                    },
                  ]}
                />
              </>
            ),
          },
          {
            key: "areas",
            label: `Khu vực / tầng (${data.areas.length})`,
            children: (
              <div className="space-y-2">
                {data.areas.map((a) => (
                  <div key={a.id} className="flex items-center gap-2">
                    <Input
                      defaultValue={a.name}
                      onBlur={(e) =>
                        e.target.value.trim() &&
                        e.target.value.trim() !== a.name &&
                        run(async () => {
                          const x = await updateArea(store.id, a.id, { name: e.target.value.trim() });
                          set({ areas: data.areas.map((y) => (y.id === x.id ? x : y)) });
                        })
                      }
                    />
                    <span className="w-16 shrink-0 text-xs text-slate-500">{data.tables.filter((t) => t.areaId === a.id).length} bàn</span>
                    <Popconfirm
                      title={`Xoá khu “${a.name}”?`}
                      description="Bàn trong khu chuyển về “Chưa xếp khu”."
                      okText="Xoá"
                      okButtonProps={{ danger: true }}
                      cancelText="Huỷ"
                      onConfirm={() =>
                        run(async () => {
                          await deleteArea(store.id, a.id);
                          reload();
                        })
                      }
                    >
                      <Button danger icon={<LuTrash2 size={13} />} />
                    </Popconfirm>
                  </div>
                ))}
                <div className="flex gap-2 pt-2">
                  <Input placeholder="Tên khu vực mới (VD: Tầng 2, Sân vườn, Khu bida…)" value={newArea} onChange={(e) => setNewArea(e.target.value)} onPressEnter={addArea} />
                  <Button type="primary" icon={<LuPlus size={14} />} onClick={addArea}>
                    Thêm
                  </Button>
                </div>
              </div>
            ),
          },
        ]}
      />

      <Modal
        open={!!edit}
        title={edit?.mode === "bulk" ? "Thêm nhanh nhiều bàn" : edit?.item ? `Sửa ${edit.item.name}` : "Thêm bàn / phòng"}
        onCancel={() => setEdit(null)}
        footer={null}
        destroyOnHidden
      >
        <Form
          form={form}
          {...FORM_PROPS}
          onFinish={save}
          onValuesChange={(c) => {
            // Đổi loại → điền sẵn giá giờ mẫu (bida 60k/h block 30′, karaoke 150k/h tối thiểu 1h…)
            if (c.kind && !edit?.item) form.setFieldsValue(TABLE_KIND[c.kind as TableKind].preset);
          }}
        >
          {edit?.mode === "bulk" ? (
            <FormGrid cols={3}>
              <Form.Item label="Tiền tố tên" name="prefix" extra="VD: B → B1, B2…">
                <Input />
              </Form.Item>
              <Form.Item label="Bắt đầu từ số" name="from">
                <InputNumber className="!w-full" min={0} />
              </Form.Item>
              <Form.Item label="Số lượng" name="count" rules={[{ required: true }]}>
                <InputNumber className="!w-full" min={1} max={100} />
              </Form.Item>
            </FormGrid>
          ) : (
            <Form.Item label="Tên" name="name" rules={[{ required: true, whitespace: true, message: "Nhập tên bàn" }]}>
              <Input placeholder="VD: Bàn 5, Bida 2, Phòng VIP 1" />
            </Form.Item>
          )}
          <FormGrid>
            <Form.Item label="Khu vực / tầng" name="areaId">
              <Select allowClear placeholder="Chưa xếp khu" options={data.areas.map((a) => ({ value: a.id, label: a.name }))} />
            </Form.Item>
            <Form.Item label="Loại" name="kind">
              <Select options={(Object.keys(TABLE_KIND) as TableKind[]).map((k) => ({ value: k, label: TABLE_KIND[k].label }))} />
            </Form.Item>
            <Form.Item label="Số chỗ" name="seats">
              <InputNumber className="!w-full" min={0} max={500} />
            </Form.Item>
            <Form.Item label="Giá theo giờ (đ)" name="pricePerHour" extra="0 = không tính giờ (bàn quán nước)">
              <InputNumber
                className="!w-full"
                min={0}
                step={10_000}
                formatter={(v) => (v ? Number(v).toLocaleString("vi-VN") : "")}
                parser={(v) => Number((v ?? "").replace(/\D/g, "")) as never}
              />
            </Form.Item>
            {timed && (
              <>
                <Form.Item label="Làm tròn" name="blockMinutes" extra="Làm tròn lên: block 30′ → 41′ tính 1 giờ">
                  <Select options={BLOCKS} />
                </Form.Item>
                <Form.Item label="Tính tối thiểu (phút)" name="minMinutes">
                  <Select options={[0, 15, 30, 60, 90, 120].map((v) => ({ value: v, label: v ? dur(v) : "Không" }))} />
                </Form.Item>
              </>
            )}
          </FormGrid>
          {kind && timed && (
            <div className="-mt-1 mb-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
              Ví dụ: chơi 1h10 → tính{" "}
              <b>{money(timeCharge(new Date(0), new Date(70 * 60_000), form.getFieldValue("pricePerHour") ?? 0, form.getFieldValue("blockMinutes") ?? 30, form.getFieldValue("minMinutes") ?? 0).charge)}</b>
            </div>
          )}
          <FormFooter>
            <Button onClick={() => setEdit(null)}>Huỷ</Button>
            <Button type="primary" htmlType="submit">
              Lưu
            </Button>
          </FormFooter>
        </Form>
      </Modal>
    </Drawer>
  );
}

// ───────────────────────── chọn / tạo nhanh khách hàng ─────────────────────────

/** Select khách hàng + nút "Khách mới" mở form tạo nhanh (tên, SĐT); tạo xong tự chọn khách đó */
function CustomerPicker({
  store,
  value,
  onChange,
  onCreated,
  size,
  placeholder = "Tìm theo tên / SĐT",
}: {
  store: StoreConfig;
  value?: string;
  onChange?: (v: string | undefined) => void;
  onCreated: (c: StoreCustomerItem) => void;
  size?: "small";
  placeholder?: string;
}) {
  const { message } = AntApp.useApp();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm<{ name: string; phone: string; note?: string }>();
  const [search, setSearch] = useState("");

  const create = async (v: { name: string; phone: string; note?: string }) => {
    setSaving(true);
    try {
      const c = await addStoreCustomer(store.id, { name: v.name.trim(), phone: v.phone.trim(), note: v.note?.trim() || undefined } as never);
      onCreated(c);
      onChange?.(c.id);
      message.success(`Đã tạo khách ${c.name}`);
      setOpen(false);
    } catch (e) {
      message.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  const openCreate = () => {
    form.resetFields();
    // Đang gõ số điện thoại / tên trong ô tìm → điền sẵn
    const q = search.trim();
    form.setFieldsValue(/^[+\d\s.]{6,}$/.test(q) ? { phone: q.replace(/[\s.]/g, "") } : q ? { name: q } : {});
    setOpen(true);
  };

  return (
    <>
      <div className="flex gap-1.5">
        <Select
          size={size}
          allowClear
          showSearch
          optionFilterProp="label"
          placeholder={placeholder}
          className="min-w-0 flex-1"
          value={value}
          onChange={(v) => onChange?.(v)}
          onSearch={setSearch}
          notFoundContent={
            <div className="py-2 text-center text-xs text-slate-500">
              Không thấy khách.{" "}
              <button type="button" className="font-semibold text-brand-600 hover:underline" onClick={openCreate}>
                Tạo khách mới
              </button>
            </div>
          }
          options={store.customers.map((c) => ({ value: c.id, label: `${c.name} · ${c.phone}` }))}
        />
        <Tooltip title="Tạo khách mới">
          <Button size={size} icon={<LuUserPlus size={size ? 13 : 14} />} onClick={openCreate} aria-label="Tạo khách mới" />
        </Tooltip>
      </div>
      <Modal open={open} title="Khách hàng mới" onCancel={() => setOpen(false)} footer={null} width={400} destroyOnHidden>
        <Form form={form} {...FORM_PROPS} onFinish={create}>
          <Form.Item label="Họ tên" name="name" rules={[{ required: true, whitespace: true, message: "Nhập tên khách" }]}>
            <Input autoFocus placeholder="VD: Anh Nam" />
          </Form.Item>
          <Form.Item label="Số điện thoại" name="phone" rules={[{ required: true, message: "Nhập SĐT" }, { pattern: /^[+\d][\d\s.]{7,14}$/, message: "SĐT không hợp lệ" }]}>
            <Input inputMode="tel" placeholder="09xx xxx xxx" />
          </Form.Item>
          <Form.Item label="Ghi chú" name="note">
            <Input placeholder="Tuỳ chọn" />
          </Form.Item>
          <FormFooter>
            <Button onClick={() => setOpen(false)}>Huỷ</Button>
            <Button type="primary" htmlType="submit" loading={saving}>
              Tạo & gắn vào bàn
            </Button>
          </FormFooter>
        </Form>
      </Modal>
    </>
  );
}
