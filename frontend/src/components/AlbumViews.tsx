import { App as AntApp, Button, ColorPicker, DatePicker, Drawer, Empty, Input, Modal, Popconfirm, Popover, Progress, Select, Spin, Tag, Tooltip } from "antd";
import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { IconType } from "react-icons";
import {
  LuArrowDown,
  LuArrowUp,
  LuBaby,
  LuBriefcase,
  LuCake,
  LuFlower2,
  LuGift,
  LuGraduationCap,
  LuPartyPopper,
  LuPawPrint,
  LuPlane,
  LuShirt,
  LuSparkles,
  LuTags,
  LuUsers,
  LuCalendarHeart,
  LuCamera,
  LuCheck,
  LuEye,
  LuGem,
  LuHeart,
  LuImagePlus,
  LuImages,
  LuLink,
  LuPlus,
  LuSend,
  LuStar,
  LuTrash2,
  LuUndo2,
  LuUpload,
} from "react-icons/lu";
import { SiDropbox, SiGoogledrive, SiGooglephotos, SiIcloud } from "react-icons/si";
import {
  AlbumDetail,
  AlbumKind,
  AlbumKindDef,
  AlbumLink,
  AlbumSummary,
  createAlbum,
  deleteAlbum,
  deleteAlbumPhoto,
  fetchAlbum,
  fetchAlbumKinds,
  fetchAlbums,
  fetchStoreThread,
  publishAlbum,
  saveAlbumKinds,
  sendStoreMessage,
  shrinkImage,
  StoreMessage,
  unpublishAlbum,
  updateAlbum,
  uploadAlbumPhotos,
} from "../data/album-api";
import { ApiError } from "../data/platform-api";
import type { StoreConfig } from "../data/store-api";

const errMsg = (e: unknown, fb = "Thao tác thất bại") => (e instanceof ApiError ? e.message : fb);

// ═══════════════════════════════ Loại album (shop tự tạo) ═══════════════════════════════

export const KIND_ICONS: Record<string, IconType> = {
  camera: LuCamera,
  heart: LuHeart,
  gem: LuGem,
  images: LuImages,
  baby: LuBaby,
  cake: LuCake,
  graduation: LuGraduationCap,
  users: LuUsers,
  gift: LuGift,
  sparkles: LuSparkles,
  flower: LuFlower2,
  party: LuPartyPopper,
  plane: LuPlane,
  briefcase: LuBriefcase,
  paw: LuPawPrint,
  shirt: LuShirt,
  star: LuStar,
};
const KIND_COLORS = ["#0ea5e9", "#e11d48", "#d97706", "#64748b", "#ec4899", "#8b5cf6", "#10b981", "#f97316", "#14b8a6", "#6366f1", "#84cc16", "#0f172a"];

const DEFAULT_KINDS: AlbumKindDef[] = [
  { key: "today", label: "Hôm nay", color: "#0ea5e9", icon: "camera", hint: "Ảnh chụp trong ngày, gửi khách xem ngay" },
  { key: "wedding", label: "Ảnh cưới", color: "#e11d48", icon: "heart", hint: "Ảnh cưới / pre-wedding" },
  { key: "engagement", label: "Đám hỏi", color: "#d97706", icon: "gem", hint: "Lễ dạm ngõ, ăn hỏi" },
  { key: "other", label: "Khác", color: "#64748b", icon: "images", hint: "Sự kiện, kỷ yếu, gia đình…" },
];

export interface KindView {
  key: AlbumKind;
  /** Tên ngắn — VD "Ảnh cưới" */
  short: string;
  /** Tên đầy đủ — VD "Album ảnh cưới" (tên mặc định của album mới) */
  label: string;
  icon: React.ReactNode;
  color: string;
  hint: string;
}

const toView = (d: AlbumKindDef): KindView => {
  const Icon = KIND_ICONS[d.icon] ?? LuImages;
  return { key: d.key, short: d.label, label: `Album ${d.label.toLocaleLowerCase("vi-VN")}`, icon: <Icon size={18} />, color: d.color, hint: d.hint ?? "" };
};

// Bộ nhớ dùng chung giữa các màn (Album ảnh, Khách hàng…) — sửa loại ở đâu cũng cập nhật mọi nơi
const kindCache = new Map<string, AlbumKindDef[]>();
const kindLoading = new Map<string, Promise<void>>();
const kindSubs = new Set<() => void>();
const putKinds = (storeId: string, kinds: AlbumKindDef[]) => {
  kindCache.set(storeId, kinds);
  kindSubs.forEach((f) => f());
};

/** Loại album của shop: { kinds, kindOf(key) } — tải 1 lần / store, mặc định trong lúc chờ. */
export function useAlbumKinds(storeId: string) {
  const [, force] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    kindSubs.add(force);
    return () => void kindSubs.delete(force);
  }, []);
  useEffect(() => {
    if (kindCache.has(storeId) || kindLoading.has(storeId)) return;
    kindLoading.set(
      storeId,
      fetchAlbumKinds(storeId)
        .then((k) => putKinds(storeId, k))
        .catch(() => undefined)
        .finally(() => kindLoading.delete(storeId)),
    );
  }, [storeId]);
  const defs = kindCache.get(storeId) ?? DEFAULT_KINDS;
  const kinds = useMemo(() => defs.map(toView), [defs]);
  const kindOf = useCallback(
    (k: string) => kinds.find((x) => x.key === k) ?? kinds.find((x) => x.key === "other") ?? kinds[kinds.length - 1],
    [kinds],
  );
  return { kinds, kindOf };
}

type KindDraft = Omit<AlbumKindDef, "key"> & { key?: string; _id: string };
let draftSeq = 0;

/** Quản lý loại album: thêm / đổi tên, màu, biểu tượng / sắp xếp / xoá. */
export function AlbumKindsModal({ storeId, open, onClose }: { storeId: string; open: boolean; onClose: () => void }) {
  const { message } = AntApp.useApp();
  const [rows, setRows] = useState<KindDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const lastInput = useRef<HTMLInputElement | null>(null);
  const [focusNew, setFocusNew] = useState(false);

  useAlbumKinds(storeId); // đăng ký nhận cập nhật + tải nếu chưa có
  const loaded = kindCache.get(storeId);
  useEffect(() => {
    if (!open) return;
    setRows((loaded ?? DEFAULT_KINDS).map((d) => ({ ...d, _id: `r${++draftSeq}` })));
  }, [open, loaded]);
  useEffect(() => {
    if (focusNew) {
      lastInput.current?.focus();
      setFocusNew(false);
    }
  }, [focusNew]);

  const edit = (i: number, p: Partial<KindDraft>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const move = (i: number, d: number) =>
    setRows((r) => {
      const n = r.slice();
      const [x] = n.splice(i, 1);
      n.splice(i + d, 0, x);
      return n;
    });
  const add = () => {
    setRows((r) => [...r, { _id: `r${++draftSeq}`, label: "", color: KIND_COLORS[r.length % KIND_COLORS.length], icon: "star", hint: "" }]);
    setFocusNew(true);
  };

  const save = async () => {
    const clean = rows.map((r) => ({ ...r, label: r.label.trim(), hint: r.hint?.trim() }));
    if (!clean.length) return message.warning("Cần ít nhất 1 loại album");
    if (clean.some((r) => !r.label)) return message.warning("Đặt tên cho mọi loại album");
    const names = clean.map((r) => r.label.toLocaleLowerCase("vi-VN"));
    if (new Set(names).size !== names.length) return message.warning("Có 2 loại trùng tên");
    setSaving(true);
    try {
      const res = await saveAlbumKinds(
        storeId,
        clean.map(({ _id: _x, ...r }) => r),
      );
      putKinds(storeId, res.kinds);
      message.success(res.moved ? `Đã lưu loại album · ${res.moved} album chuyển sang "${toView(res.kinds.find((k) => k.key === "other") ?? res.kinds[res.kinds.length - 1]).short}"` : "Đã lưu loại album");
      onClose();
    } catch (e) {
      message.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  const removedHasOther = rows.some((r) => r.key === "other");

  return (
    <Modal
      title={
        <span className="flex items-center gap-2">
          <LuTags size={16} /> Loại album
        </span>
      }
      open={open}
      onCancel={onClose}
      onOk={save}
      okText="Lưu"
      cancelText="Huỷ"
      confirmLoading={saving}
      width={640}
      destroyOnHidden
    >
      <p className="mb-3 text-xs text-slate-500">
        Tự đặt loại album theo dịch vụ của quán (VD: Sinh nhật, Kỷ yếu, Gia đình, Thời trang…). Album thuộc loại bị xoá sẽ chuyển sang{" "}
        <b>{removedHasOther ? "Khác" : "loại cuối danh sách"}</b>.
      </p>
      <div className="space-y-2">
        {rows.map((r, i) => {
          const Icon = KIND_ICONS[r.icon] ?? LuImages;
          return (
            <div key={r._id} className="flex items-center gap-2 rounded-xl border border-slate-200 p-2">
              <Popover
                trigger="click"
                placement="bottomLeft"
                content={
                  <div className="w-64 space-y-3">
                    <div className="grid grid-cols-6 gap-1">
                      {Object.entries(KIND_ICONS).map(([k, I]) => (
                        <button
                          key={k}
                          type="button"
                          onClick={() => edit(i, { icon: k })}
                          className={`flex h-9 w-9 items-center justify-center rounded-lg transition ${r.icon === k ? "text-white" : "text-slate-600 hover:bg-slate-100"}`}
                          style={r.icon === k ? { background: r.color } : undefined}
                        >
                          <I size={17} />
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {KIND_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => edit(i, { color: c })}
                          className={`h-6 w-6 rounded-full ring-offset-2 ${r.color === c ? "ring-2 ring-slate-400" : ""}`}
                          style={{ background: c }}
                          aria-label={c}
                        />
                      ))}
                      <ColorPicker size="small" disabledAlpha value={r.color} onChangeComplete={(c) => edit(i, { color: c.toHexString() })} />
                    </div>
                  </div>
                }
              >
                <button
                  type="button"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
                  style={{ background: r.color }}
                  aria-label="Đổi biểu tượng & màu"
                  title="Đổi biểu tượng & màu"
                >
                  <Icon size={17} />
                </button>
              </Popover>
              <Input
                ref={(el) => {
                  if (i === rows.length - 1) lastInput.current = el?.input ?? null;
                }}
                placeholder="Tên loại (VD: Sinh nhật)"
                value={r.label}
                maxLength={40}
                onChange={(e) => edit(i, { label: e.target.value })}
                style={{ width: 170, flexShrink: 0 }}
              />
              <Input placeholder="Mô tả ngắn (tuỳ chọn)" value={r.hint} maxLength={80} onChange={(e) => edit(i, { hint: e.target.value })} />
              <div className="flex shrink-0">
                <Button type="text" size="small" icon={<LuArrowUp size={14} />} disabled={i === 0} onClick={() => move(i, -1)} aria-label="Lên" />
                <Button
                  type="text"
                  size="small"
                  icon={<LuArrowDown size={14} />}
                  disabled={i === rows.length - 1}
                  onClick={() => move(i, 1)}
                  aria-label="Xuống"
                />
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<LuTrash2 size={14} />}
                  disabled={rows.length <= 1}
                  onClick={() => setRows((x) => x.filter((_, j) => j !== i))}
                  aria-label="Xoá"
                />
              </div>
            </div>
          );
        })}
      </div>
      <Button className="mt-3" block type="dashed" icon={<LuPlus size={14} />} onClick={add} disabled={rows.length >= 20}>
        Thêm loại album
      </Button>
    </Modal>
  );
}

export const PROVIDERS: Record<string, { label: string; icon: React.ReactNode }> = {
  google_drive: { label: "Google Drive", icon: <SiGoogledrive size={14} /> },
  google_photos: { label: "Google Photos", icon: <SiGooglephotos size={14} /> },
  dropbox: { label: "Dropbox", icon: <SiDropbox size={14} /> },
  icloud: { label: "iCloud", icon: <SiIcloud size={14} /> },
  onedrive: { label: "OneDrive", icon: <LuLink size={14} /> },
  fshare: { label: "Fshare", icon: <LuLink size={14} /> },
  link: { label: "Link", icon: <LuLink size={14} /> },
};
export const guessProvider = (url: string) => {
  try {
    const h = new URL(url).hostname;
    if (/drive\.google|docs\.google/.test(h)) return "google_drive";
    if (/photos\.google|photos\.app\.goo\.gl/.test(h)) return "google_photos";
    if (/dropbox/.test(h)) return "dropbox";
    if (/icloud/.test(h)) return "icloud";
    if (/onedrive|1drv\.ms|sharepoint/.test(h)) return "onedrive";
    if (/fshare/.test(h)) return "fshare";
  } catch {
    // chưa phải URL
  }
  return "link";
};

function StatusChip({ a }: { a: AlbumSummary }) {
  if (a.status === "draft") return <Tag className="m-0">Nháp</Tag>;
  if (a.viewedAt)
    return (
      <Tooltip title={`Khách mở xem lúc ${dayjs(a.viewedAt).format("HH:mm DD/MM")}`}>
        <Tag color="green" className="m-0">
          <LuEye size={11} className="mr-1 inline" />
          Khách đã xem
        </Tag>
      </Tooltip>
    );
  return (
    <Tag color="blue" className="m-0">
      Đã gửi {a.publishedAt ? dayjs(a.publishedAt).format("DD/MM") : ""}
    </Tag>
  );
}

// ═══════════════════════════════ Danh sách album ═══════════════════════════════

export function AlbumsSection({ store, initialCustomerId }: { store: StoreConfig; initialCustomerId?: string }) {
  const { message } = AntApp.useApp();
  const [albums, setAlbums] = useState<AlbumSummary[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [customerId, setCustomerId] = useState<string | undefined>(initialCustomerId);
  const [kind, setKind] = useState<AlbumKind | "all">("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [kindsOpen, setKindsOpen] = useState(false);
  const { kinds, kindOf } = useAlbumKinds(store.id);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setAlbums(await fetchAlbums(store.id, { customerId }));
    } catch (e) {
      message.error(errMsg(e, "Không tải được album"));
    } finally {
      setLoading(false);
    }
  }, [store.id, customerId, message]);

  useEffect(() => {
    load();
  }, [load]);

  const shown = (albums ?? []).filter((a) => kind === "all" || kindOf(a.kind).key === kind);
  const counts = useMemo(
    () => Object.fromEntries(kinds.map((k) => [k.key, (albums ?? []).filter((a) => kindOf(a.kind).key === k.key).length])),
    [albums, kinds, kindOf],
  );

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-base font-bold text-slate-900">
              <LuImages size={18} className="text-brand-600" /> Album ảnh khách
            </h3>
            <p className="text-xs text-slate-500">
              Tải ảnh xem trước + gắn link ảnh gốc (Google Drive…). Bấm “Gửi cho khách” để khách nhận tin và xem trong Mini App.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="Tất cả khách hàng"
              value={customerId}
              onChange={setCustomerId}
              style={{ width: 220 }}
              options={store.customers.map((c) => ({ value: c.id, label: `${c.name}${c.phone ? ` · ${c.phone}` : ""}` }))}
            />
            <Button icon={<LuTags size={15} />} onClick={() => setKindsOpen(true)}>
              Loại album
            </Button>
            <Button type="primary" icon={<LuPlus size={15} />} onClick={() => setCreateOpen(true)}>
              Tạo album
            </Button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {[{ key: "all" as const, short: "Tất cả", icon: null, color: "" }, ...kinds].map((k) => (
            <button
              key={k.key}
              type="button"
              onClick={() => setKind(k.key)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition ${
                kind === k.key ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {k.short}
              <span className="opacity-60">{k.key === "all" ? (albums?.length ?? 0) : counts[k.key]}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => setKindsOpen(true)}
            className="flex items-center gap-1 rounded-full border border-dashed border-slate-300 px-3 py-1 text-xs font-semibold text-slate-500 hover:border-brand-400 hover:text-brand-600"
          >
            <LuPlus size={12} /> Thêm loại
          </button>
        </div>
      </div>

      {loading && !albums ? (
        <div className="flex justify-center py-16">
          <Spin />
        </div>
      ) : shown.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-14">
          <Empty
            description={store.customers.length ? "Chưa có album nào" : "Thêm khách hàng ở mục Khách hàng trước, rồi tạo album cho khách"}
          >
            {store.customers.length > 0 && (
              <Button type="primary" icon={<LuPlus size={15} />} onClick={() => setCreateOpen(true)}>
                Tạo album đầu tiên
              </Button>
            )}
          </Empty>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {shown.map((a) => {
            const k = kindOf(a.kind);
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => setOpenId(a.id)}
                className="group overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                  {a.coverUrl ? (
                    <img src={a.coverUrl} alt="" className="h-full w-full object-cover transition group-hover:scale-105" loading="lazy" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center" style={{ color: k.color }}>
                      {a.links.length ? <SiGoogledrive size={34} className="opacity-40" /> : <LuImagePlus size={34} className="opacity-40" />}
                    </div>
                  )}
                  <span
                    className="absolute left-2 top-2 flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold text-white shadow"
                    style={{ background: k.color }}
                  >
                    {k.icon && <span className="[&>svg]:h-3 [&>svg]:w-3">{k.icon}</span>}
                    {k.short}
                  </span>
                  <span className="absolute bottom-2 right-2 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-semibold text-white">
                    {a.photoCount} ảnh{a.links.length ? ` · ${a.links.length} link` : ""}
                  </span>
                </div>
                <div className="space-y-1 p-3">
                  <div className="truncate text-sm font-bold text-slate-900">{a.title}</div>
                  <div className="truncate text-xs text-slate-500">
                    {a.customer?.name}
                    {a.eventDate ? ` · ${dayjs(a.eventDate).format("DD/MM/YYYY")}` : ""}
                  </div>
                  <StatusChip a={a} />
                </div>
              </button>
            );
          })}
        </div>
      )}

      <CreateAlbumModal
        open={createOpen}
        store={store}
        defaultCustomerId={customerId}
        onClose={() => setCreateOpen(false)}
        onCreated={(a) => {
          setCreateOpen(false);
          load();
          setOpenId(a.id);
        }}
      />
      <AlbumDrawer
        storeId={store.id}
        albumId={openId}
        onClose={() => setOpenId(null)}
        onChanged={load}
      />
      <AlbumKindsModal storeId={store.id} open={kindsOpen} onClose={() => setKindsOpen(false)} />
    </div>
  );
}

// ═══════════════════════════════ Tạo album ═══════════════════════════════

function CreateAlbumModal({
  open,
  store,
  defaultCustomerId,
  onClose,
  onCreated,
}: {
  open: boolean;
  store: StoreConfig;
  defaultCustomerId?: string;
  onClose: () => void;
  onCreated: (a: AlbumDetail) => void;
}) {
  const { message } = AntApp.useApp();
  const { kinds, kindOf } = useAlbumKinds(store.id);
  const [kindsOpen, setKindsOpen] = useState(false);
  const [kind, setKind] = useState<AlbumKind>("today");
  const [customerId, setCustomerId] = useState<string | undefined>();
  const [title, setTitle] = useState("");
  const [titleTouched, setTitleTouched] = useState(false);
  const [date, setDate] = useState<dayjs.Dayjs | null>(dayjs());
  const [links, setLinks] = useState<{ label: string; url: string }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setKind(kinds[0]?.key ?? "today");
    setCustomerId(defaultCustomerId);
    setTitle("");
    setTitleTouched(false);
    setDate(dayjs());
    setLinks([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultCustomerId]);

  const autoTitle = kind === "today" ? `Album ngày ${(date ?? dayjs()).format("DD/MM/YYYY")}` : kindOf(kind).label;
  const finalTitle = titleTouched ? title : autoTitle;

  const submit = async () => {
    if (!customerId) return message.warning("Chọn khách hàng");
    const clean = links.filter((l) => l.url.trim());
    setSaving(true);
    try {
      const a = await createAlbum(store.id, {
        customerId,
        kind,
        title: finalTitle,
        eventDate: date ? date.format("YYYY-MM-DD") : null,
        links: clean.map((l) => ({ label: l.label.trim() || PROVIDERS[guessProvider(l.url)].label, url: l.url.trim() })),
      });
      message.success("Đã tạo album — tải ảnh lên nhé");
      onCreated(a);
    } catch (e) {
      message.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Tạo album ảnh" open={open} onCancel={onClose} onOk={submit} okText="Tạo album" confirmLoading={saving} width={620} destroyOnHidden>
      <div className="space-y-4 pt-2">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {kinds.map((k) => (
            <button
              key={k.key}
              type="button"
              onClick={() => setKind(k.key)}
              className={`rounded-2xl border p-3 text-left transition ${
                kind === k.key ? "border-transparent ring-2" : "border-slate-200 hover:border-slate-300"
              }`}
              style={kind === k.key ? { boxShadow: `0 0 0 2px ${k.color}`, background: `${k.color}0d` } : undefined}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-xl text-white" style={{ background: k.color }}>
                {k.icon}
              </span>
              <div className="mt-2 text-sm font-bold text-slate-900">{k.short}</div>
              <div className="text-[11px] leading-tight text-slate-500">{k.hint}</div>
            </button>
          ))}
          <button
            type="button"
            onClick={() => setKindsOpen(true)}
            className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-slate-300 p-3 text-xs font-semibold text-slate-500 hover:border-brand-400 hover:text-brand-600"
          >
            <LuPlus size={18} /> Thêm / sửa loại
          </button>
        </div>
        <AlbumKindsModal storeId={store.id} open={kindsOpen} onClose={() => setKindsOpen(false)} />

        <div>
          <div className="mb-1 text-xs font-semibold text-slate-600">Khách hàng *</div>
          <Select
            showSearch
            className="w-full"
            optionFilterProp="label"
            placeholder="Chọn khách hàng của cửa hàng"
            value={customerId}
            onChange={setCustomerId}
            options={store.customers.map((c) => ({ value: c.id, label: `${c.name}${c.phone ? ` · ${c.phone}` : ""}` }))}
            notFoundContent="Chưa có khách — thêm ở mục Khách hàng"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
          <div>
            <div className="mb-1 text-xs font-semibold text-slate-600">Tên album</div>
            <Input
              value={finalTitle}
              onChange={(e) => {
                setTitleTouched(true);
                setTitle(e.target.value);
              }}
              maxLength={120}
            />
          </div>
          <div>
            <div className="mb-1 text-xs font-semibold text-slate-600">Ngày chụp</div>
            <DatePicker className="w-full" value={date} onChange={setDate} format="DD/MM/YYYY" />
          </div>
        </div>

        <LinksEditor links={links} onChange={setLinks} />
      </div>
    </Modal>
  );
}

function LinksEditor({ links, onChange }: { links: { label: string; url: string }[]; onChange: (l: { label: string; url: string }[]) => void }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-600">Link ảnh gốc (Google Drive, Google Photos, Dropbox…)</span>
        <Button size="small" type="link" icon={<LuPlus size={13} />} onClick={() => onChange([...links, { label: "", url: "" }])}>
          Thêm link
        </Button>
      </div>
      {links.length === 0 && (
        <button
          type="button"
          onClick={() => onChange([{ label: "", url: "" }])}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-3 text-xs text-slate-500 hover:border-brand-400 hover:text-brand-600"
        >
          <SiGoogledrive size={14} /> Dán link thư mục ảnh gốc để khách tải bản đầy đủ
        </button>
      )}
      <div className="space-y-2">
        {links.map((l, i) => {
          const prov = PROVIDERS[guessProvider(l.url)];
          return (
            <div key={i} className="flex items-center gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">{prov.icon}</span>
              <Input
                placeholder="Tên (VD: Ảnh gốc ngày cưới)"
                value={l.label}
                onChange={(e) => onChange(links.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                style={{ width: 130, flexShrink: 0 }}
              />
              <Input
                placeholder="https://drive.google.com/…"
                value={l.url}
                onChange={(e) => onChange(links.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))}
              />
              <Button type="text" danger icon={<LuTrash2 size={14} />} onClick={() => onChange(links.filter((_, j) => j !== i))} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════ Chi tiết album ═══════════════════════════════

export function AlbumDrawer({
  storeId,
  albumId,
  onClose,
  onChanged,
}: {
  storeId: string;
  albumId: string | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { message } = AntApp.useApp();
  const { kinds, kindOf } = useAlbumKinds(storeId);
  const [album, setAlbum] = useState<AlbumDetail | null>(null);
  const [links, setLinks] = useState<{ label: string; url: string }[]>([]);
  const [linksDirty, setLinksDirty] = useState(false);
  const [note, setNote] = useState("");
  const [upload, setUpload] = useState<{ done: number; total: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishMsg, setPublishMsg] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const apply = (a: AlbumDetail) => {
    setAlbum(a);
    setLinks(a.links.map(({ label, url }) => ({ label, url })));
    setLinksDirty(false);
    setNote(a.note ?? "");
  };

  useEffect(() => {
    setAlbum(null);
    if (!albumId) return;
    fetchAlbum(storeId, albumId).then(apply).catch((e) => message.error(errMsg(e)));
  }, [storeId, albumId, message]);

  const save = async (data: Parameters<typeof updateAlbum>[2], ok?: string) => {
    if (!album) return;
    try {
      apply(await updateAlbum(storeId, album.id, data));
      onChanged();
      if (ok) message.success(ok);
    } catch (e) {
      message.error(errMsg(e));
    }
  };

  const handleFiles = async (list: FileList | File[]) => {
    if (!album) return;
    const files = Array.from(list).filter((f) => f.type.startsWith("image/"));
    if (!files.length) return message.warning("Chọn file ảnh (JPG, PNG, WebP)");
    setUpload({ done: 0, total: files.length });
    let added = 0;
    const errors: string[] = [];
    for (let i = 0; i < files.length; i += 8) {
      const batch = await Promise.all(files.slice(i, i + 8).map(async (f) => ({ blob: await shrinkImage(f), name: f.name })));
      try {
        const r = await uploadAlbumPhotos(storeId, album.id, batch);
        added += r.added.length;
        errors.push(...r.errors);
      } catch (e) {
        errors.push(errMsg(e));
      }
      setUpload({ done: Math.min(files.length, i + 8), total: files.length });
    }
    setUpload(null);
    apply(await fetchAlbum(storeId, album.id));
    onChanged();
    if (added) message.success(`Đã tải ${added} ảnh`);
    if (errors.length) message.warning(`${errors.length} ảnh lỗi: ${errors.slice(0, 2).join("; ")}`);
  };

  const k = album ? kindOf(album.kind) : kinds[0];

  return (
    <Drawer
      open={!!albumId}
      onClose={onClose}
      size={980}
      title={
        album ? (
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg text-white [&>svg]:h-4 [&>svg]:w-4" style={{ background: k.color }}>
              {k.icon}
            </span>
            <span className="truncate">{album.title}</span>
            <StatusChip a={album} />
          </div>
        ) : (
          "Album"
        )
      }
      extra={
        album && (
          <div className="flex gap-2">
            {album.status === "published" && (
              <Popconfirm title="Thu hồi album? Khách sẽ không xem được nữa." onConfirm={async () => {
                apply(await unpublishAlbum(storeId, album.id));
                onChanged();
              }}>
                <Button icon={<LuUndo2 size={14} />}>Thu hồi</Button>
              </Popconfirm>
            )}
            <Button
              type="primary"
              icon={<LuSend size={14} />}
              onClick={() => {
                setPublishMsg(
                  `Chào ${album.customer?.name ?? "bạn"}, ${album.title.toLowerCase().startsWith("album") ? album.title.charAt(0).toLowerCase() + album.title.slice(1) : `album "${album.title}"`} đã sẵn sàng 🎉 Bạn mở mục "Album ảnh" để xem${album.links.length ? " và tải ảnh gốc" : ""} nhé!`,
                );
                setPublishOpen(true);
              }}
            >
              {album.status === "published" ? "Gửi lại cho khách" : "Gửi cho khách"}
            </Button>
          </div>
        )
      }
    >
      {!album ? (
        <div className="flex justify-center py-20">
          <Spin />
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
          {/* Ảnh */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              handleFiles(e.dataTransfer.files);
            }}
            className={`rounded-2xl border-2 border-dashed p-3 transition ${dragOver ? "border-brand-500 bg-brand-50" : "border-transparent"}`}
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-bold text-slate-900">Ảnh xem trước ({album.photos.length})</div>
              <Button icon={<LuUpload size={14} />} onClick={() => fileInput.current?.click()} disabled={!!upload}>
                Tải ảnh lên
              </Button>
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => {
                  if (e.target.files) handleFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </div>
            {upload && (
              <div className="mb-3">
                <Progress percent={Math.round((upload.done / upload.total) * 100)} size="small" />
                <div className="text-[11px] text-slate-500">
                  Đang tải {upload.done}/{upload.total} ảnh (tự thu nhỏ ≤ 2048px)…
                </div>
              </div>
            )}
            {album.photos.length === 0 ? (
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-16 text-sm text-slate-500 hover:border-brand-400 hover:text-brand-600"
              >
                <LuImagePlus size={30} />
                Kéo thả ảnh vào đây hoặc bấm để chọn
                <span className="text-[11px] text-slate-400">Ảnh được thu nhỏ để xem nhanh — ảnh gốc gửi khách qua link bên phải</span>
              </button>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {album.photos.map((p) => (
                  <div key={p.id} className="group relative aspect-square overflow-hidden rounded-xl bg-slate-100">
                    <img src={p.url} alt={p.filename} loading="lazy" className="h-full w-full cursor-zoom-in object-cover" onClick={() => setPreview(p.url)} />
                    {album.coverPhotoId === p.id && (
                      <span className="absolute left-1.5 top-1.5 rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-white shadow">Bìa</span>
                    )}
                    <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-gradient-to-t from-black/60 to-transparent p-1.5 opacity-0 transition group-hover:opacity-100">
                      {album.coverPhotoId !== p.id && (
                        <Tooltip title="Đặt làm ảnh bìa">
                          <button type="button" className="rounded-lg bg-white/90 p-1 text-amber-500" onClick={() => save({ coverPhotoId: p.id }, "Đã đổi ảnh bìa")}>
                            <LuStar size={13} />
                          </button>
                        </Tooltip>
                      )}
                      <Popconfirm
                        title="Xoá ảnh này?"
                        onConfirm={async () => {
                          try {
                            await deleteAlbumPhoto(storeId, album.id, p.id);
                            apply(await fetchAlbum(storeId, album.id));
                            onChanged();
                          } catch (e) {
                            message.error(errMsg(e));
                          }
                        }}
                      >
                        <button type="button" className="rounded-lg bg-white/90 p-1 text-rose-500">
                          <LuTrash2 size={13} />
                        </button>
                      </Popconfirm>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-slate-300 text-xs text-slate-400 hover:border-brand-400 hover:text-brand-600"
                >
                  <LuImagePlus size={20} /> Thêm ảnh
                </button>
              </div>
            )}
          </div>

          {/* Thông tin */}
          <div className="space-y-4">
            <div>
              <div className="mb-1 text-xs font-semibold text-slate-600">Loại album</div>
              <Select
                className="w-full"
                value={k.key}
                onChange={(v) => save({ kind: v }, "Đã đổi loại album")}
                options={kinds.map((x) => ({
                  value: x.key,
                  label: (
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: x.color }} />
                      {x.short}
                    </span>
                  ),
                }))}
              />
            </div>
            <div className="rounded-2xl bg-slate-50 p-3 text-xs text-slate-600">
              <div className="mb-1 font-bold text-slate-800">{album.customer?.name}</div>
              <div>{album.customer?.phone || "Chưa có SĐT"}</div>
              {album.eventDate && (
                <div className="mt-1 flex items-center gap-1">
                  <LuCalendarHeart size={12} /> Ngày chụp {dayjs(album.eventDate).format("DD/MM/YYYY")}
                </div>
              )}
              {album.publishedAt && <div className="mt-1">Đã gửi {dayjs(album.publishedAt).format("HH:mm DD/MM/YYYY")}</div>}
              {album.viewedAt && (
                <div className="mt-1 flex items-center gap-1 font-semibold text-emerald-600">
                  <LuCheck size={12} /> Khách đã xem {dayjs(album.viewedAt).format("HH:mm DD/MM")}
                </div>
              )}
            </div>

            <div>
              <LinksEditor
                links={links}
                onChange={(l) => {
                  setLinks(l);
                  setLinksDirty(true);
                }}
              />
              {linksDirty && (
                <Button
                  size="small"
                  type="primary"
                  className="mt-2"
                  onClick={() =>
                    save(
                      {
                        links: links
                          .filter((l) => l.url.trim())
                          .map((l) => ({ label: l.label.trim() || PROVIDERS[guessProvider(l.url)].label, url: l.url.trim() })),
                      },
                      "Đã lưu link ảnh gốc",
                    )
                  }
                >
                  Lưu link
                </Button>
              )}
              {!linksDirty && album.links.length > 0 && (
                <div className="mt-2 space-y-1">
                  {album.links.map((l: AlbumLink) => (
                    <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="block truncate text-[11px] text-brand-600 hover:underline">
                      Mở {l.label} ↗
                    </a>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="mb-1 text-xs font-semibold text-slate-600">Ghi chú cho khách</div>
              <Input.TextArea
                rows={3}
                value={note}
                maxLength={1000}
                placeholder="VD: Ảnh đã chỉnh màu, bản in giao ngày 30/11"
                onChange={(e) => setNote(e.target.value)}
                onBlur={() => note !== (album.note ?? "") && save({ note }, "Đã lưu ghi chú")}
              />
            </div>

            <CustomerThread storeId={storeId} customerId={album.customerId} refreshKey={album.publishedAt ?? ""} />

            <Popconfirm
              title="Xoá album và toàn bộ ảnh xem trước?"
              description="Link ảnh gốc trên Drive không bị ảnh hưởng."
              onConfirm={async () => {
                try {
                  await deleteAlbum(storeId, album.id);
                  onChanged();
                  onClose();
                } catch (e) {
                  message.error(errMsg(e));
                }
              }}
            >
              <Button danger type="text" icon={<LuTrash2 size={14} />}>
                Xoá album
              </Button>
            </Popconfirm>
          </div>
        </div>
      )}

      <Modal
        title="Gửi album cho khách"
        open={publishOpen}
        onCancel={() => setPublishOpen(false)}
        okText="Gửi"
        onOk={async () => {
          if (!album) return;
          try {
            apply(await publishAlbum(storeId, album.id, publishMsg));
            onChanged();
            setPublishOpen(false);
            message.success("Đã gửi — khách nhận tin trong Mini App của cửa hàng");
          } catch (e) {
            message.error(errMsg(e));
          }
        }}
      >
        <p className="mb-2 text-xs text-slate-500">
          Tin nhắn vào hộp thư của khách trong Mini App cửa hàng, album hiện chấm đỏ “mới” cho tới khi khách mở xem.
        </p>
        <Input.TextArea rows={4} value={publishMsg} onChange={(e) => setPublishMsg(e.target.value)} maxLength={2000} showCount />
      </Modal>

      <Modal open={!!preview} footer={null} onCancel={() => setPreview(null)} width={1000} centered>
        {preview && <img src={preview} alt="" className="mx-auto max-h-[80vh] rounded-lg" />}
      </Modal>
    </Drawer>
  );
}

/** Tin nhắn giữa cửa hàng và khách (báo album, khách hỏi lại…). */
export function CustomerThread({
  storeId,
  customerId,
  refreshKey,
  tall = false,
  onRead,
}: {
  storeId: string;
  customerId: string;
  refreshKey: string;
  /** Khung chat cao (dùng trong hồ sơ khách) */
  tall?: boolean;
  /** Gọi sau khi mở hội thoại (tin khách gửi đã được đánh dấu đọc) */
  onRead?: () => void;
}) {
  const { message } = AntApp.useApp();
  const [msgs, setMsgs] = useState<StoreMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    box.current?.scrollTo({ top: box.current.scrollHeight });
  }, [msgs]);

  useEffect(() => {
    const load = () =>
      fetchStoreThread(storeId, customerId)
        .then((m) => {
          setMsgs((old) => (old.length === m.length && old[old.length - 1]?.id === m[m.length - 1]?.id ? old : m));
          onRead?.();
        })
        .catch(() => undefined);
    load();
    // Đang mở hội thoại → hỏi tin mới mỗi 15 giây
    const t = tall ? setInterval(load, 15000) : undefined;
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, customerId, refreshKey, tall]);

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      const m = await sendStoreMessage(storeId, customerId, text);
      setMsgs((l) => [...l, m]);
      setText("");
    } catch (e) {
      message.error(errMsg(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <div className="mb-1 text-xs font-semibold text-slate-600">Tin nhắn với khách</div>
      <div ref={box} className={`${tall ? "h-[52vh]" : "max-h-56"} space-y-1.5 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-2`}>
        {msgs.length === 0 && <div className="py-3 text-center text-[11px] text-slate-400">Chưa có tin nhắn</div>}
        {msgs.map((m) => (
          <div key={m.id} className={`flex ${m.direction === "out" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-2.5 py-1.5 text-xs ${
                m.direction === "out" ? "bg-brand-600 text-white" : "border border-slate-200 bg-white text-slate-800"
              }`}
            >
              <div className="whitespace-pre-wrap">{m.body}</div>
              <div className={`mt-0.5 text-[10px] ${m.direction === "out" ? "text-white/70" : "text-slate-400"}`}>
                {dayjs(m.createdAt).format("HH:mm DD/MM")}
                {m.direction === "out" && (m.readAt ? " · đã xem" : "")}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-end gap-1.5">
        {tall ? (
          <Input.TextArea
            value={text}
            autoSize={{ minRows: 2, maxRows: 5 }}
            placeholder="Nhắn cho khách… (Enter để gửi, Shift+Enter xuống dòng) — khách xem trong Mini App của quán"
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            maxLength={2000}
          />
        ) : (
          <Input size="small" value={text} placeholder="Nhắn cho khách…" onChange={(e) => setText(e.target.value)} onPressEnter={send} />
        )}
        <Button size={tall ? "middle" : "small"} type="primary" icon={<LuSend size={tall ? 15 : 12} />} loading={sending} onClick={send}>
          {tall ? "Gửi" : null}
        </Button>
      </div>
    </div>
  );
}
