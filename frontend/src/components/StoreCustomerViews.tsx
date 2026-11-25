import { App as AntApp, Badge, Button, Drawer, Dropdown, Empty, Grid, Input, Modal, Progress, Select, Spin, Table, Tabs, Tag, Tooltip } from "antd";
import dayjs from "dayjs";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  LuCalendarCheck,
  LuCalendarPlus,
  LuChevronRight,
  LuCrown,
  LuEllipsis,
  LuImagePlus,
  LuLink,
  LuMapPin,
  LuMessageCircle,
  LuPencil,
  LuPhone,
  LuPlus,
  LuSearch,
  LuSend,
  LuSendHorizontal,
  LuTrash2,
  LuUpload,
  LuX,
} from "react-icons/lu";
import {
  AlbumKind,
  AlbumSummary,
  Conversation,
  createAlbum,
  fetchAlbums,
  fetchConversations,
  publishAlbum,
  shrinkImage,
  uploadAlbumPhotos,
} from "../data/album-api";
import { ApiError } from "../data/platform-api";
import type { StoreBookingItem, StoreConfig, StoreCustomerItem, StoreOrderItem } from "../data/store-api";
import { AlbumDrawer, AlbumKindsModal, CustomerThread, guessProvider, PROVIDERS, useAlbumKinds } from "./AlbumViews";
import { BookingCreateModal } from "./StoreOperationsViews";
import { StampGrid } from "./StoreStampViews";
import { FilterBar, PageHeader } from "./ui";

const ORDER_STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: "Chờ xác nhận", color: "gold" },
  confirmed: { label: "Đã xác nhận", color: "blue" },
  shipping: { label: "Đang giao", color: "cyan" },
  completed: { label: "Hoàn thành", color: "green" },
  cancelled: { label: "Đã huỷ", color: "default" },
};
const BOOKING_STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: "Chờ xác nhận", color: "gold" },
  confirmed: { label: "Đã xác nhận", color: "blue" },
  completed: { label: "Hoàn thành", color: "green" },
  cancelled: { label: "Đã huỷ", color: "default" },
};
const money = (n: number) => `${n.toLocaleString("vi-VN")}đ`;
const errMsg = (e: unknown, f: string) => (e instanceof ApiError ? e.message : f);

/** "14:05" hôm nay, "Hôm qua", "T3" trong tuần, "12/11" xa hơn — giống danh sách chat Zalo */
function shortTime(iso: string) {
  const d = dayjs(iso);
  const now = dayjs();
  if (d.isSame(now, "day")) return d.format("HH:mm");
  if (d.isSame(now.subtract(1, "day"), "day")) return "Hôm qua";
  if (now.diff(d, "day") < 7) return ["CN", "T2", "T3", "T4", "T5", "T6", "T7"][d.day()];
  return d.format(d.isSame(now, "year") ? "DD/MM" : "DD/MM/YY");
}

function tierColorOf(store: StoreConfig, tier: string) {
  return (store.memberTiers ?? []).find((t) => t.name === tier)?.color ?? "#64748b";
}

function Avatar({ c, color, size = 44 }: { c: StoreCustomerItem; color: string; size?: number }) {
  return c.avatarUrl ? (
    <img src={c.avatarUrl} alt="" referrerPolicy="no-referrer" className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <span
      className="flex shrink-0 items-center justify-center rounded-full font-bold text-white"
      style={{ width: size, height: size, background: color, fontSize: size * 0.4 }}
    >
      {c.name.slice(0, 1).toUpperCase()}
    </span>
  );
}

// ───────────────────────── Trang Khách hàng ─────────────────────────

type DropPayload = { customer: StoreCustomerItem; files: File[]; links: { label: string; url: string }[] };

const URL_RE = /^https?:\/\/\S+$/i;

/** Lấy ảnh + link từ một lần kéo thả (file ảnh, link kéo từ trình duyệt hoặc chữ dán vào) */
function readDrop(dt: DataTransfer) {
  const files = Array.from(dt.files).filter((f) => f.type.startsWith("image/"));
  const raw = `${dt.getData("text/uri-list")}\n${dt.getData("text/plain")}`;
  const urls = Array.from(new Set(raw.split(/\s+/).filter((x) => URL_RE.test(x) && !x.startsWith("blob:"))));
  return { files, links: files.length ? [] : urls.map((url) => ({ label: PROVIDERS[guessProvider(url)].label, url })) };
}

/**
 * Tệp khách hàng — xem nhanh & thao tác nhanh: đặt lịch, nhắn tin, kéo thả ảnh / link vào dòng
 * của khách để tạo album gửi ngay. Bấm vào dòng mở hồ sơ chi tiết.
 */
export function CustomersSection({
  store,
  unreadMap,
  onUnreadChange,
  onAdd,
  onEdit,
  onDelete,
  onCreateBooking,
}: {
  store: StoreConfig;
  unreadMap: Record<string, number>;
  onUnreadChange: () => void;
  onAdd: () => void;
  onEdit: (c: StoreCustomerItem) => void;
  onDelete: (customerId: string) => Promise<boolean>;
  onCreateBooking: (b: StoreBookingItem) => void;
}) {
  const { message } = AntApp.useApp();
  const [q, setQ] = useState("");
  const [convs, setConvs] = useState<Record<string, Conversation>>({});
  const [profile, setProfile] = useState<{ id: string; tab: string } | null>(null);
  const wide = !!Grid.useBreakpoint().lg;
  const [bookingFor, setBookingFor] = useState<StoreCustomerItem | null>(null);
  const [sendTo, setSendTo] = useState<DropPayload | null>(null);
  const [dragRow, setDragRow] = useState<string | null>(null);
  const [albumOpen, setAlbumOpen] = useState<string | null>(null);
  const [albumsVersion, setAlbumsVersion] = useState(0);

  const loadConvs = () =>
    fetchConversations(store.id)
      .then((list) => setConvs(Object.fromEntries(list.map((c) => [c.customerId, c]))))
      .catch(() => undefined);
  useEffect(() => {
    setConvs({});
    loadConvs();
    const t = setInterval(() => !document.hidden && loadConvs(), 30000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.id]);
  const refresh = () => {
    loadConvs();
    onUnreadChange();
  };

  const today = dayjs().format("YYYY-MM-DD");
  const nextBooking = useMemo(() => {
    const map: Record<string, StoreBookingItem> = {};
    const byPhone = new Map(store.customers.map((c) => [c.phone, c.id]));
    for (const b of (store.bookings ?? []).filter((x) => x.date >= today && x.status !== "cancelled")) {
      const cid = b.customerId ?? byPhone.get(b.phone);
      if (!cid) continue;
      const cur = map[cid];
      if (!cur || b.date + b.timeSlot < cur.date + cur.timeSlot) map[cid] = b;
    }
    return map;
  }, [store.bookings, store.customers, today]);

  const kw = q.trim().toLowerCase();
  const rows = store.customers.filter(
    (c) => !kw || `${c.name} ${c.phone} ${c.tier} ${c.note ?? ""}`.toLowerCase().includes(kw),
  );

  const openDrop = (customer: StoreCustomerItem, dt: DataTransfer) => {
    const { files, links } = readDrop(dt);
    if (!files.length && !links.length) return message.warning("Chỉ nhận ảnh hoặc link (Drive, Google Photos…)");
    setSendTo({ customer, files, links });
  };

  const profileCustomer = store.customers.find((c) => c.id === profile?.id) ?? null;

  return (
    <div
      className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5"
      // Thả trượt ra ngoài dòng khách thì không để trình duyệt mở file
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        setDragRow(null);
      }}
    >
      <PageHeader
        title={<>Tệp khách hàng ({store.customers.length})</>}
        description={<><LuUpload size={12} className="mr-1 inline" />
            Kéo thả <b>ảnh</b> hoặc <b>link</b> (Drive, Google Photos…) vào dòng của khách để gửi album ngay.</>}
      />
      <FilterBar
        search={
          <Input
            allowClear
            value={q}
            onChange={(e) => setQ(e.target.value)}
            prefix={<LuSearch size={14} className="text-slate-400" />}
            placeholder="Tìm tên, SĐT, hạng..."
          />
        }
        actions={
          <Button type="primary" icon={<LuPlus size={15} />} onClick={onAdd}>
            Thêm khách hàng
          </Button>
        }
      />

      <Table
        rowKey="id"
        size="small"
        dataSource={rows}
        pagination={{ pageSize: 10, showSizeChanger: false, hideOnSinglePage: true }}
        tableLayout="fixed"
        scroll={{ x: 1080 }}
        locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có khách hàng" /> }}
        rowClassName={(r) => `cursor-pointer ${dragRow === r.id ? "[&>td]:!bg-brand-50 outline outline-2 -outline-offset-2 outline-brand-500" : ""}`}
        onRow={(rec) => ({
          onClick: () => setProfile({ id: rec.id, tab: "info" }),
          onDragEnter: (e) => {
            e.preventDefault();
            setDragRow(rec.id);
          },
          onDragOver: (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
            if (dragRow !== rec.id) setDragRow(rec.id);
          },
          onDrop: (e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragRow(null);
            openDrop(rec, e.dataTransfer);
          },
        })}
        columns={[
          {
            title: "Khách hàng",
            dataIndex: "name",
            width: 240,
            render: (_, c) => (
              <div className="flex items-center gap-2.5">
                <Avatar c={c} color={tierColorOf(store, c.tier)} size={34} />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                    <span className="truncate">{c.name}</span>
                    {c.zaloUserId && (
                      <Tooltip title={c.lastLoginAt ? `Mini App · lần cuối ${dayjs(c.lastLoginAt).format("HH:mm DD/MM")}` : "Đã đăng nhập Mini App"}>
                        <Tag color="blue" className="m-0 text-xs">
                          Zalo
                        </Tag>
                      </Tooltip>
                    )}
                  </div>
                  <div className="text-xs text-slate-500">{c.phone || "Chưa có SĐT"}</div>
                </div>
              </div>
            ),
          },
          {
            title: "Hạng / Chi tiêu",
            dataIndex: "tier",
            width: 180,
            render: (tier, c) => (
              <div className="text-xs">
                <span className="inline-flex items-center gap-1 font-bold" style={{ color: tierColorOf(store, tier) }}>
                  <LuCrown size={12} /> {tier}
                </span>
                <div className="whitespace-nowrap text-xs tabular-nums text-slate-500">
                  {money(c.totalSpent)} · {c.points.toLocaleString("vi-VN")} điểm
                </div>
              </div>
            ),
          },
          {
            title: "Lịch hẹn tới",
            width: 170,
            render: (_, c) => {
              const b = nextBooking[c.id];
              return b ? (
                <div className="text-xs">
                  <div className="font-semibold text-slate-800">
                    {b.timeSlot} · {b.date === today ? "Hôm nay" : dayjs(b.date).format("DD/MM")}
                  </div>
                  <div className="truncate text-xs text-slate-500">{b.serviceName}</div>
                </div>
              ) : (
                <span className="text-xs text-slate-300">—</span>
              );
            },
          },
          {
            title: "Tin nhắn",
            render: (_, c) => {
              const cv = convs[c.id];
              const unread = unreadMap[c.id] ?? cv?.unread ?? 0;
              return cv ? (
                <div className="flex min-w-0 items-center gap-2 text-xs">
                  <span className={`min-w-0 flex-1 truncate ${unread ? "font-semibold text-slate-900" : "text-slate-500"}`}>
                    {cv.lastDirection === "out" ? "Bạn: " : ""}
                    {cv.lastBody}
                  </span>
                  {unread > 0 ? <Badge count={unread} size="small" /> : <span className="shrink-0 text-xs text-slate-400">{shortTime(cv.lastAt)}</span>}
                </div>
              ) : (
                <span className="text-xs text-slate-300">—</span>
              );
            },
          },
          {
            title: "",
            align: "right",
            width: 290,
            render: (_, c) => (
              <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                <Button size="small" icon={<LuCalendarPlus size={13} />} onClick={() => setBookingFor(c)}>
                  Đặt lịch
                </Button>
                <Badge count={unreadMap[c.id] ?? 0} size="small">
                  <Button size="small" icon={<LuMessageCircle size={13} />} onClick={() => setProfile({ id: c.id, tab: "chat" })}>
                    Nhắn tin
                  </Button>
                </Badge>
                <Button size="small" type="primary" ghost icon={<LuSendHorizontal size={13} />} onClick={() => setSendTo({ customer: c, files: [], links: [] })}>
                  Gửi ảnh
                </Button>
              </div>
            ),
          },
        ]}
      />

      {/* Đặt lịch nhanh */}
      <BookingCreateModal
        open={!!bookingFor}
        onClose={() => setBookingFor(null)}
        store={store}
        defaults={bookingFor ? { customerName: bookingFor.name, phone: bookingFor.phone } : undefined}
        staffOptions={Array.from(new Set((store.bookings ?? []).map((b) => b.staffName).filter((x): x is string => !!x)))}
        onCreate={(b) => {
          onCreateBooking(b);
          message.success(`Đã đặt lịch ${b.timeSlot} ${dayjs(b.date).format("DD/MM")} cho ${b.customerName}`);
        }}
      />

      {/* Gửi ảnh / link thành album */}
      <QuickSendModal
        payload={sendTo}
        store={store}
        onClose={() => setSendTo(null)}
        onSent={() => {
          setSendTo(null);
          loadConvs();
          setAlbumsVersion((v) => v + 1);
        }}
      />

      {/* Xem / sửa album ngay tại đây */}
      <AlbumDrawer
        storeId={store.id}
        albumId={albumOpen}
        onClose={() => setAlbumOpen(null)}
        onChanged={() => {
          setAlbumsVersion((v) => v + 1);
          loadConvs();
        }}
      />

      {/* Hồ sơ chi tiết (phụ) */}
      <Drawer
        open={!!profileCustomer}
        onClose={() => setProfile(null)}
        // Màn rộng: khung chat liền bên trái hồ sơ (cùng 1 Drawer); màn hẹp: chat là tab "Tin nhắn"
        size={wide ? PROFILE_W + CHAT_W : PROFILE_W}
        title="Hồ sơ khách hàng"
        styles={{ body: { padding: 0, display: "flex", minHeight: 0 } }}
      >
        {profileCustomer && wide && (
          <ProfileChat key={profileCustomer.id} store={store} customer={profileCustomer} onRead={refresh} className="w-[440px] shrink-0 border-r border-slate-200" />
        )}
        {profileCustomer && (
          <div className="min-w-0 flex-1 overflow-y-auto">
          <CustomerProfile
            key={`${profileCustomer.id}-${profile?.tab}`}
            initialTab={wide && profile?.tab === "chat" ? "info" : (profile?.tab ?? "info")}
            chat={wide ? undefined : <ProfileChat store={store} customer={profileCustomer} onRead={refresh} className="h-[60vh]" />}
            store={store}
            customer={profileCustomer}
            onEdit={onEdit}
            onDelete={async (id) => {
              if (await onDelete(id)) setProfile(null);
            }}
            albumsVersion={albumsVersion}
            onOpenAlbum={setAlbumOpen}
            onBooking={() => setBookingFor(profileCustomer)}
            onSendPhotos={() => setSendTo({ customer: profileCustomer, files: [], links: [] })}
          />
          </div>
        )}
      </Drawer>
    </div>
  );
}

// ───────────────────────── Khung chat cạnh hồ sơ khách ─────────────────────────

const PROFILE_W = 420;
const CHAT_W = 440;

/** Khung tin nhắn với khách — nằm trong Drawer hồ sơ (cột trái trên màn rộng, tab "Tin nhắn" trên màn hẹp). */
function ProfileChat({ store, customer, onRead, className = "" }: { store: StoreConfig; customer: StoreCustomerItem; onRead: () => void; className?: string }) {
  return (
    <div className={`flex min-h-0 flex-col bg-white ${className}`}>
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2.5">
        <LuMessageCircle size={15} className="text-brand-600" />
        <span className="text-sm font-semibold text-slate-900">Tin nhắn</span>
        {customer.zaloUserId ? <Tag color="blue" className="!m-0">Zalo</Tag> : <Tag className="!m-0">Chưa dùng Mini App</Tag>}
      </div>
      {!customer.zaloUserId && (
        <div className="mx-3 mt-3 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800">
          Khách chưa đăng nhập Mini App — tin vẫn được lưu, khách thấy khi đăng nhập Zalo (khớp theo SĐT).
        </div>
      )}
      <div className="min-h-0 flex-1 p-3">
        <CustomerThread storeId={store.id} customerId={customer.id} refreshKey="" fill onRead={onRead} />
      </div>
    </div>
  );
}

// ───────────────────────── Gửi ảnh / link cho khách ─────────────────────────

function QuickSendModal({
  payload,
  store,
  onClose,
  onSent,
}: {
  payload: DropPayload | null;
  store: StoreConfig;
  onClose: () => void;
  onSent: () => void;
}) {
  const { message } = AntApp.useApp();
  const [files, setFiles] = useState<{ file: File; url: string }[]>([]);
  const [links, setLinks] = useState<{ label: string; url: string }[]>([]);
  const [title, setTitle] = useState("");
  const { kinds } = useAlbumKinds(store.id);
  const [kindsOpen, setKindsOpen] = useState(false);
  const [kind, setKind] = useState<AlbumKind>("today");
  const [note, setNote] = useState("");
  const [linkInput, setLinkInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [over, setOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const customer = payload?.customer;

  useEffect(() => {
    if (!payload) return;
    setFiles(payload.files.map((file) => ({ file, url: URL.createObjectURL(file) })));
    setLinks(payload.links);
    setKind(kinds[0]?.key ?? "today");
    setNote("");
    setLinkInput("");
    setProgress(null);
    setTitle(payload.files.length || !payload.links.length ? `Ảnh ngày ${dayjs().format("DD/MM")}` : payload.links[0].label);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload]);
  // Giải phóng ảnh xem trước
  useEffect(() => () => files.forEach((f) => URL.revokeObjectURL(f.url)), [files]);

  const addFiles = (list: File[]) => {
    const imgs = list.filter((f) => f.type.startsWith("image/"));
    if (!imgs.length) return;
    setFiles((old) => [...old, ...imgs.map((file) => ({ file, url: URL.createObjectURL(file) }))]);
  };
  const addLink = (raw: string) => {
    const url = raw.trim();
    if (!URL_RE.test(url)) return message.warning("Link phải bắt đầu bằng http:// hoặc https://");
    setLinks((l) => [...l, { label: PROVIDERS[guessProvider(url)].label, url }]);
    setLinkInput("");
  };

  const submit = async () => {
    if (!customer) return;
    if (!files.length && !links.length) return message.warning("Thêm ít nhất 1 ảnh hoặc 1 link");
    setBusy(true);
    try {
      const album = await createAlbum(store.id, {
        customerId: customer.id,
        title: title.trim() || `Ảnh ngày ${dayjs().format("DD/MM")}`,
        kind,
        eventDate: dayjs().format("YYYY-MM-DD"),
        links: links.map((l) => ({ label: l.label.trim() || PROVIDERS[guessProvider(l.url)].label, url: l.url })),
      });
      if (files.length) {
        setProgress({ done: 0, total: files.length });
        const errors: string[] = [];
        for (let i = 0; i < files.length; i += 10) {
          const batch = await Promise.all(files.slice(i, i + 10).map(async (f) => ({ blob: await shrinkImage(f.file), name: f.file.name })));
          const r = await uploadAlbumPhotos(store.id, album.id, batch);
          errors.push(...r.errors);
          setProgress({ done: Math.min(files.length, i + 10), total: files.length });
        }
        if (errors.length) message.warning(`${errors.length} ảnh không tải được`);
      }
      await publishAlbum(store.id, album.id, note.trim() || undefined);
      message.success(`Đã gửi "${album.title}" cho ${customer.name}`);
      onSent();
    } catch (e) {
      message.error(errMsg(e, "Gửi thất bại"));
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  return (
    <Modal
      open={!!payload}
      onCancel={() => !busy && onClose()}
      width={640}
      destroyOnHidden
      title={
        customer && (
          <span className="inline-flex items-center gap-2">
            <LuSendHorizontal size={16} /> Gửi ảnh cho {customer.name}
          </span>
        )
      }
      footer={
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-slate-500">
            {files.length} ảnh · {links.length} link — khách nhận tin báo trong Mini App
          </span>
          <div className="flex gap-2">
            <Button onClick={onClose} disabled={busy}>
              Huỷ
            </Button>
            <Button type="primary" icon={<LuSend size={14} />} loading={busy} onClick={submit} disabled={!files.length && !links.length}>
              Gửi cho khách
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Ảnh */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOver(false);
            const d = readDrop(e.dataTransfer);
            addFiles(Array.from(e.dataTransfer.files));
            if (!d.files.length) d.links.forEach((l) => setLinks((x) => [...x, l]));
          }}
          className={`rounded-2xl border-2 border-dashed p-3 transition ${over ? "border-brand-500 bg-brand-50" : "border-slate-200 bg-slate-50"}`}
        >
          {files.length ? (
            <div className="grid max-h-64 grid-cols-4 gap-2 overflow-y-auto sm:grid-cols-6">
              {files.map((f, i) => (
                <div key={f.url} className="group relative aspect-square overflow-hidden rounded-lg bg-slate-200">
                  <img src={f.url} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setFiles((l) => l.filter((_, j) => j !== i))}
                    className="absolute right-1 top-1 hidden h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white group-hover:flex"
                    aria-label="Bỏ ảnh"
                  >
                    <LuX size={12} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-slate-300 text-slate-400 hover:border-brand-400 hover:text-brand-600"
              >
                <LuPlus size={18} />
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => fileInput.current?.click()} className="flex w-full flex-col items-center py-6 text-slate-500">
              <LuImagePlus size={28} className="text-slate-400" />
              <span className="mt-2 text-sm font-semibold">Kéo thả ảnh vào đây hoặc bấm để chọn</span>
              <span className="text-xs text-slate-400">Chọn 1 hoặc nhiều ảnh · ảnh tự thu nhỏ trước khi tải lên</span>
            </button>
          )}
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              addFiles(Array.from(e.target.files ?? []));
              e.target.value = "";
            }}
          />
        </div>

        {/* Link ảnh gốc */}
        <div>
          <div className="mb-1.5 text-xs font-bold text-slate-600">Link ảnh gốc (Drive, Google Photos…)</div>
          <div className="space-y-1.5">
            {links.map((l, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-slate-500">{PROVIDERS[guessProvider(l.url)].icon}</span>
                <Input
                  size="small"
                  value={l.label}
                  placeholder="Tên link"
                  onChange={(e) => setLinks((x) => x.map((y, j) => (j === i ? { ...y, label: e.target.value } : y)))}
                  style={{ width: 180 }}
                />
                <a href={l.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-xs text-brand-600">
                  {l.url}
                </a>
                <Button size="small" type="text" icon={<LuX size={13} />} onClick={() => setLinks((x) => x.filter((_, j) => j !== i))} />
              </div>
            ))}
            <Input.Search
              size="small"
              value={linkInput}
              onChange={(e) => setLinkInput(e.target.value)}
              onSearch={(v) => v.trim() && addLink(v)}
              enterButton="Thêm link"
              placeholder="Dán link vào đây…"
              prefix={<LuLink size={13} className="text-slate-400" />}
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div>
            <div className="mb-1.5 text-xs font-bold text-slate-600">Tên album</div>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
          </div>
          <div>
            <div className="mb-1.5 text-xs font-bold text-slate-600">Loại</div>
            <div className="flex gap-1">
              <Select
                value={kinds.some((k) => k.key === kind) ? kind : kinds[0]?.key}
                onChange={setKind}
                style={{ width: 170 }}
                options={kinds.map((k) => ({
                  value: k.key,
                  label: (
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: k.color }} />
                      {k.short}
                    </span>
                  ),
                }))}
              />
              <Tooltip title="Thêm / sửa loại album">
                <Button icon={<LuPlus size={14} />} onClick={() => setKindsOpen(true)} aria-label="Thêm loại album" />
              </Tooltip>
            </div>
            <AlbumKindsModal storeId={store.id} open={kindsOpen} onClose={() => setKindsOpen(false)} />
          </div>
        </div>
        <div>
          <div className="mb-1.5 text-xs font-bold text-slate-600">Lời nhắn kèm (tuỳ chọn)</div>
          <Input.TextArea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            autoSize={{ minRows: 2, maxRows: 4 }}
            maxLength={2000}
            placeholder={`VD: Gửi ${customer?.name ?? "bạn"} ảnh hôm nay, mở mục Album ảnh để xem và tải ảnh gốc nhé!`}
          />
        </div>
        {progress && <Progress percent={Math.round((progress.done / progress.total) * 100)} format={() => `${progress.done}/${progress.total} ảnh`} />}
      </div>
    </Modal>
  );
}

// ───────────────────────── Thông tin khách (cột phải) ─────────────────────────

function CustomerProfile({
  store,
  customer,
  onEdit,
  onDelete,
  albumsVersion = 0,
  onOpenAlbum,
  onBooking,
  onSendPhotos,
  initialTab = "info",
  chat,
}: {
  store: StoreConfig;
  customer: StoreCustomerItem;
  albumsVersion?: number;
  onEdit: (c: StoreCustomerItem) => void;
  onDelete: (customerId: string) => void | Promise<void>;
  onOpenAlbum: (albumId: string) => void;
  onBooking: () => void;
  onSendPhotos: () => void;
  initialTab?: string;
  /** Màn hẹp: khung chat hiện thành tab "Tin nhắn" */
  chat?: ReactNode;
}) {
  const { modal } = AntApp.useApp();
  const { kindOf } = useAlbumKinds(store.id);
  const [albums, setAlbums] = useState<AlbumSummary[] | null>(null);
  const [tab, setTab] = useState(initialTab === "chat" && !chat ? "info" : initialTab);

  useEffect(() => {
    setTab("info");
  }, [customer.id]);
  useEffect(() => {
    setAlbums(null);
    fetchAlbums(store.id, { customerId: customer.id }).then(setAlbums).catch(() => setAlbums([]));
  }, [store.id, customer.id, albumsVersion]);

  // Đơn / lịch gắn theo tài khoản khách; lịch tạo tại quầy chưa gắn thì khớp theo SĐT
  const mine = <T extends { customerId?: string | null; phone: string }>(list: T[] | undefined) =>
    (list ?? []).filter((x) => x.customerId === customer.id || (!x.customerId && !!customer.phone && x.phone === customer.phone));
  const orders = mine(store.orders).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const bookings = mine(store.bookings).sort((a, b) => (b.date + b.timeSlot).localeCompare(a.date + a.timeSlot));
  const upcoming = bookings.filter((b) => b.date >= dayjs().format("YYYY-MM-DD") && b.status !== "cancelled");
  const tiers = (store.memberTiers ?? []).slice().sort((a, b) => a.minSpent - b.minSpent);
  const tierColor = tierColorOf(store, customer.tier);
  const curTier = tiers.filter((t) => t.minSpent <= customer.totalSpent).pop();
  const nextTier = tiers.find((t) => t.minSpent > customer.totalSpent);
  const progress = nextTier
    ? Math.min(100, Math.round(((customer.totalSpent - (curTier?.minSpent ?? 0)) / Math.max(1, nextTier.minSpent - (curTier?.minSpent ?? 0))) * 100))
    : 100;

  const confirmDelete = () =>
    modal.confirm({
      title: `Xoá khách "${customer.name}"?`,
      content: "Album ảnh và tin nhắn của khách bị xoá theo. Đơn hàng, lịch hẹn vẫn giữ lại nhưng không còn gắn với khách.",
      okText: "Xoá khách",
      okButtonProps: { danger: true },
      cancelText: "Huỷ",
      onOk: () => onDelete(customer.id),
    });

  return (
    <div>
      <div className="px-4 pb-4 pt-5 text-center" style={{ background: `linear-gradient(180deg, ${tierColor}1f, #ffffff)` }}>
        <div className="flex justify-center">
          <Avatar c={customer} color={tierColor} size={72} />
        </div>
        <div className="mt-2 text-base font-extrabold text-slate-900">{customer.name}</div>
        <div className="mt-1 flex flex-wrap justify-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-2xs font-bold text-white" style={{ background: tierColor }}>
            <LuCrown size={11} /> {customer.tier}
          </span>
          {customer.zaloUserId ? (
            <Tag color="blue" className="m-0 text-xs">
              Mini App
            </Tag>
          ) : (
            <Tag className="m-0 text-xs">Chưa dùng Mini App</Tag>
          )}
        </div>
        <div className="mt-3 flex flex-wrap justify-center gap-1.5">
          <Button size="small" icon={<LuCalendarPlus size={13} />} onClick={onBooking}>
            Đặt lịch
          </Button>
          <Button size="small" type="primary" ghost icon={<LuSendHorizontal size={13} />} onClick={onSendPhotos}>
            Gửi ảnh
          </Button>
          <Button size="small" icon={<LuPencil size={13} />} onClick={() => onEdit(customer)} aria-label="Sửa" />
          <Dropdown
            trigger={["click"]}
            menu={{ items: [{ key: "delete", danger: true, icon: <LuTrash2 size={14} />, label: "Xoá khách hàng", onClick: confirmDelete }] }}
          >
            <Button size="small" icon={<LuEllipsis size={15} />} aria-label="Thêm" />
          </Dropdown>
        </div>
      </div>

      <div className="px-4">
        <div className="grid grid-cols-3 divide-x divide-slate-200 rounded-xl border border-slate-200">
          {[
            { label: "Chi tiêu", value: money(customer.totalSpent) },
            { label: "Đơn", value: customer.totalOrders.toLocaleString("vi-VN") },
            { label: "Điểm", value: customer.points.toLocaleString("vi-VN") },
          ].map((x) => (
            <div key={x.label} className="px-1.5 py-2 text-center">
              <div className="truncate text-sm font-extrabold text-slate-900">{x.value}</div>
              <div className="text-xs text-slate-500">{x.label}</div>
            </div>
          ))}
        </div>
        {nextTier ? (
          <div className="mt-2.5">
            <div className="mb-1 text-xs text-slate-500">
              Còn <b className="text-slate-800">{money(nextTier.minSpent - customer.totalSpent)}</b> để lên{" "}
              <b style={{ color: nextTier.color }}>{nextTier.name}</b>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full" style={{ width: `${progress}%`, background: tierColor }} />
            </div>
          </div>
        ) : (
          tiers.length > 0 && <div className="mt-2 text-xs text-slate-500">Khách đang ở hạng cao nhất.</div>
        )}
      </div>

      <Tabs
        activeKey={tab}
        onChange={setTab}
        size="small"
        centered
        className="mt-2 px-4"
        items={[
          {
            key: "info",
            label: "Thông tin",
            children: (
              <div className="space-y-4 pb-5">
                <div className="space-y-2 text-xs">
                  <InfoRow icon={<LuPhone size={13} />} value={customer.phone ? <a href={`tel:${customer.phone}`}>{customer.phone}</a> : "Chưa có SĐT"} />
                  <InfoRow icon={<LuMapPin size={13} />} value={customer.address || "Chưa có địa chỉ"} />
                  <InfoRow icon={<LuCalendarCheck size={13} />} value={`Khách từ ${dayjs(customer.createdAt).format("DD/MM/YYYY")}`} />
                </div>
                {store.stampProgram?.enabled && (
                  <div className="rounded-xl border border-dashed border-slate-200 px-3 py-2.5">
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">Thẻ tích tem</span>
                      <span className="tabular-nums text-slate-500">
                        {customer.stamps ?? 0}/{store.stampProgram.required} · đã đổi {customer.stampRewards ?? 0}
                      </span>
                    </div>
                    <StampGrid program={store.stampProgram} filled={Math.min(store.stampProgram.required, customer.stamps ?? 0)} color={store.theme?.primary} size={20} />
                    <div className="mt-1.5 text-xs text-slate-500">Quà: {store.stampProgram.reward} · đổi quà ở Hạng & Voucher → Thẻ tích tem</div>
                  </div>
                )}
                {customer.note && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    <b>Ghi chú:</b> {customer.note}
                  </div>
                )}
                <Block title="Lịch hẹn sắp tới" more={bookings.length ? () => setTab("bookings") : undefined}>
                  {upcoming.length ? (
                    upcoming.slice(0, 3).map((b) => <BookingCard key={b.id} b={b} />)
                  ) : (
                    <div className="text-xs text-slate-400">Không có lịch hẹn sắp tới</div>
                  )}
                </Block>
                <Block title="Đơn gần đây" more={orders.length > 2 ? () => setTab("orders") : undefined}>
                  {orders.length ? (
                    orders.slice(0, 2).map((o) => <OrderCard key={o.id} o={o} />)
                  ) : (
                    <div className="text-xs text-slate-400">Chưa có đơn hàng</div>
                  )}
                </Block>
              </div>
            ),
          },
          {
            key: "orders",
            label: `Đơn (${orders.length})`,
            children: (
              <div className="space-y-2 pb-5">
                {orders.length ? orders.map((o) => <OrderCard key={o.id} o={o} />) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có đơn hàng" />}
              </div>
            ),
          },
          {
            key: "bookings",
            label: `Lịch (${bookings.length})`,
            children: (
              <div className="space-y-2 pb-5">
                {bookings.length ? (
                  bookings.map((b) => <BookingCard key={b.id} b={b} />)
                ) : (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có lịch hẹn" />
                )}
              </div>
            ),
          },
          {
            key: "albums",
            label: `Album (${albums?.length ?? 0})`,
            children: (
              <div className="space-y-3 pb-5">
                {albums === null ? (
                  <div className="flex justify-center py-6">
                    <Spin size="small" />
                  </div>
                ) : albums.length ? (
                  <div className="grid grid-cols-2 gap-2">
                    {albums.map((a) => {
                      const k = kindOf(a.kind);
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => onOpenAlbum(a.id)}
                          className="overflow-hidden rounded-xl border border-slate-200 text-left hover:shadow-md"
                        >
                          <div className="aspect-[4/3] bg-slate-100">
                            {a.coverUrl && <img src={a.coverUrl} alt="" className="h-full w-full object-cover" loading="lazy" />}
                          </div>
                          <div className="p-2">
                            <div className="truncate text-xs font-bold">{a.title}</div>
                            <div className="text-xs" style={{ color: k.color }}>
                              {k.short} · {a.photoCount} ảnh{a.status === "draft" ? " · nháp" : a.viewedAt ? " · đã xem" : ""}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có album" />
                )}
                <Button block type="primary" ghost icon={<LuSendHorizontal size={14} />} onClick={onSendPhotos}>
                  Gửi ảnh / link mới
                </Button>
              </div>
            ),
          },
          ...(chat ? [{ key: "chat", label: "Tin nhắn", children: <div className="pb-4">{chat}</div> }] : []),
        ]}
      />
    </div>
  );
}

const InfoRow = ({ icon, value }: { icon: React.ReactNode; value: React.ReactNode }) => (
  <div className="flex items-start gap-2 text-slate-700">
    <span className="mt-0.5 text-slate-400">{icon}</span>
    <span className="min-w-0 flex-1 break-words">{value}</span>
  </div>
);

const Block = ({ title, more, children }: { title: string; more?: () => void; children: React.ReactNode }) => (
  <div>
    <div className="mb-2 flex items-center justify-between">
      <span className="text-xs font-bold uppercase tracking-wide text-slate-400">{title}</span>
      {more && (
        <button type="button" onClick={more} className="inline-flex items-center text-xs font-semibold text-brand-600">
          Xem tất cả <LuChevronRight size={13} />
        </button>
      )}
    </div>
    <div className="space-y-1.5">{children}</div>
  </div>
);

const BookingCard = ({ b }: { b: NonNullable<StoreConfig["bookings"]>[number] }) => (
  <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs">
    <div className="min-w-0">
      <div className="font-bold text-slate-900">
        {b.timeSlot} · {dayjs(b.date).format("DD/MM/YYYY")}
      </div>
      <div className="truncate text-slate-600">
        {b.serviceName}
        {b.staffName ? ` · ${b.staffName}` : ""}
      </div>
    </div>
    <Tag color={BOOKING_STATUS[b.status]?.color} className="m-0 shrink-0">
      {BOOKING_STATUS[b.status]?.label}
    </Tag>
  </div>
);

const OrderCard = ({ o }: { o: StoreOrderItem }) => (
  <div className="rounded-xl border border-slate-200 p-3 text-xs">
    <div className="flex items-center justify-between">
      <span className="font-mono font-bold text-slate-900">{o.code}</span>
      <Tag color={ORDER_STATUS[o.status]?.color} className="m-0">
        {ORDER_STATUS[o.status]?.label}
      </Tag>
    </div>
    <div className="mt-1 truncate text-slate-600">{o.itemsSummary || "—"}</div>
    <div className="mt-1 flex justify-between text-slate-500">
      <span>{dayjs(o.createdAt).format("HH:mm DD/MM/YYYY")}</span>
      <b className="text-slate-900">{money(o.total)}</b>
    </div>
  </div>
);
