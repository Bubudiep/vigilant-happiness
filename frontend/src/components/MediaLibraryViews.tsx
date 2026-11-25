import { App as AntApp, Button, Empty, Modal, Popconfirm, Segmented, Spin, Tag } from "antd";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LuRefreshCw, LuTrash2, LuUpload } from "react-icons/lu";
import { shrinkImage } from "../data/album-api";
import { fmtBytes } from "../data/format";
import { deleteStoreMedia, fetchStoreMedia, uploadStoreMedia } from "../data/media-api";
import { findMediaInUse, mediaUsage, StoreMediaItem, usedInLabel } from "../data/media-usage";
import { ApiError } from "../data/platform-api";
import type { StoreConfig } from "../data/store-api";
import { StorageBar } from "./AlbumViews";
import { FilterBar, FilterSelect, PageHeader } from "./ui";

const TYPES: { value: string; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "product", label: "Sản phẩm" },
  { value: "banner", label: "Banner" },
  { value: "logo", label: "Logo" },
  { value: "general", label: "Khác" },
  { value: "unused", label: "Chưa dùng" }, // lọc theo trạng thái dùng, không phải loại
];
const typeLabel = (t: string) => TYPES.find((x) => x.value === t)?.label ?? t;
/** Loại ảnh khi tải lên (backend nhận logo | banner | product | general) */
const UPLOAD_TYPES = TYPES.filter((t) => t.value !== "all" && t.value !== "unused");
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Thư viện ảnh của gian hàng (ảnh tải lên từ trình thiết kế / sản phẩm): xem dung lượng, xoá ảnh thừa để giải phóng hạn mức. */
export function MediaLibrarySection({ store }: { store: StoreConfig }) {
  const { message } = AntApp.useApp();
  const [type, setType] = useState("all");
  const [items, setItems] = useState<StoreMediaItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [storageKey, setStorageKey] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await fetchStoreMedia(store.id));
      setStorageKey((n) => n + 1);
    } catch (e) {
      message.error(e instanceof ApiError ? e.message : "Không tải được thư viện ảnh");
    } finally {
      setLoading(false);
    }
  }, [store.id, message]);
  useEffect(() => {
    load();
  }, [load]);

  // Ảnh "đang dùng": URL / storageKey xuất hiện trong sản phẩm, slider, theme, thiết kế…
  const inUse = useMemo(
    () => findMediaInUse(items ?? [], [store.products, store.sliders, store.theme, store.builder]),
    [items, store.products, store.sliders, store.theme, store.builder],
  );

  // Tải ảnh lên thư viện: nén ở trình duyệt (≤ 2048px) rồi gửi lần lượt từng ảnh
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadType, setUploadType] = useState("general");
  const [uploading, setUploading] = useState<{ done: number; total: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const upload = async (list: FileList | File[] | null) => {
    const files = Array.from(list ?? []).filter((f) => f.type.startsWith("image/"));
    if (!files.length) return message.warning("Chọn file ảnh (JPG, PNG, WebP, GIF)");
    setUploading({ done: 0, total: files.length });
    let ok = 0;
    const errors: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      try {
        const blob = await shrinkImage(f);
        if (blob.size > MAX_UPLOAD_BYTES) throw new ApiError("Ảnh lớn hơn 10MB sau khi nén", 413);
        await uploadStoreMedia(store.id, blob, f.name, uploadType);
        ok++;
      } catch (e) {
        const msg = e instanceof ApiError ? e.message : "lỗi tải lên";
        if (e instanceof ApiError && e.quota) {
          errors.push(msg);
          break; // hết hạn mức: dừng các ảnh sau
        }
        errors.push(`${f.name}: ${msg}`);
      }
      setUploading({ done: i + 1, total: files.length });
    }
    setUploading(null);
    if (ok) message.success(`Đã tải lên ${ok} ảnh`);
    if (errors.length) message.error({ content: errors.slice(0, 3).join(" · ") + (errors.length > 3 ? ` (+${errors.length - 3} lỗi)` : ""), duration: 6 });
    if (type !== "all" && type !== uploadType) setType("all");
    load();
  };

  const usageOf = (m: StoreMediaItem) => mediaUsage(m, inUse);
  const shown = (items ?? []).filter((m) => (type === "all" ? true : type === "unused" ? !usageOf(m).inUse : m.type === type));
  const total = shown.reduce((s, m) => s + m.sizeBytes, 0);

  // Hộp cảnh báo xoá ảnh đang dùng (mở khi bấm xoá ảnh đang dùng, hoặc khi xoá thường nhận 409)
  const [danger, setDanger] = useState<{ item: StoreMediaItem; usedIn: string[] } | null>(null);
  const [busy, setBusy] = useState(false);

  const remove = async (m: StoreMediaItem, force = false) => {
    setBusy(true);
    try {
      const r = await deleteStoreMedia(m.id, force);
      if (!r.deleted) {
        setDanger({ item: m, usedIn: r.usedIn.length ? r.usedIn : usageOf(m).usedIn });
        return;
      }
      setDanger(null);
      setItems((list) => (list ?? []).filter((x) => x.id !== m.id));
      setStorageKey((n) => n + 1);
      message.success("Đã xoá ảnh");
    } catch (e) {
      message.error(e instanceof ApiError ? e.message : "Không xoá được ảnh");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <StorageBar storeId={store.id} refreshKey={storageKey} />
      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <PageHeader
        title="Thư viện ảnh"
        description={<>Ảnh dùng cho thiết kế, sản phẩm, banner — tải lên hoặc kéo thả vào đây. Xoá sản phẩm không tự xoá ảnh — ảnh thừa vẫn tính vào hạn mức dung lượng.</>}
      />
      <FilterBar
        filters={<><FilterSelect size="middle" value={uploadType} onChange={setUploadType} options={UPLOAD_TYPES} aria-label="Loại ảnh tải lên" /></>}
        actions={<><Button icon={<LuRefreshCw size={14} />} loading={loading} onClick={load}>
              Làm mới
            </Button>
<Button
              type="primary"
              icon={<LuUpload size={14} />}
              loading={!!uploading}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? `Đang tải ${uploading.done}/${uploading.total}` : "Tải ảnh lên"}
            </Button>
<input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              hidden
              onChange={(e) => {
                upload(e.target.files);
                e.target.value = "";
              }}
            /></>}
      />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <Segmented size="small" value={type} onChange={(v) => setType(String(v))} options={TYPES} />
          <span className="text-xs text-slate-500">
            {shown.length} ảnh · {fmtBytes(total)}
          </span>
        </div>

        <div
          className={`mt-4 rounded-xl transition ${dragOver ? "bg-brand-50 ring-2 ring-dashed ring-brand-400" : ""}`}
          onDragOver={(e) => {
            if (!e.dataTransfer.types.includes("Files")) return;
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (!uploading) upload(e.dataTransfer.files);
          }}
        >
          {!items ? (
            <div className="py-12 text-center">
              <Spin />
            </div>
          ) : shown.length === 0 ? (
            <Empty description="Chưa có ảnh nào — bấm “Tải ảnh lên” hoặc kéo thả ảnh vào đây" />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {shown.map((m) => {
                const { inUse: used, usedIn } = usageOf(m);
                return (
                  <div key={m.id} className="overflow-hidden rounded-xl border border-slate-200">
                    <div className="relative aspect-square bg-slate-100">
                      <img src={m.url} alt={m.alt || m.fileName} loading="lazy" className="h-full w-full object-cover" />
                      {used && (
                        <div className="absolute left-1.5 top-1.5 flex flex-wrap gap-1">
                          {usedIn.length ? (
                            usedIn.map((k) => (
                              <Tag key={k} color="green" className="!m-0">
                                {usedInLabel(k)}
                              </Tag>
                            ))
                          ) : (
                            <Tag color="green" className="!m-0">
                              Đang dùng
                            </Tag>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-start justify-between gap-1 p-2">
                      <div className="min-w-0">
                        <div className="truncate text-xs font-semibold text-slate-800" title={m.fileName}>
                          {m.fileName}
                        </div>
                        <div className="text-xs text-slate-500">
                          {fmtBytes(m.sizeBytes)} · {typeLabel(m.type)}
                        </div>
                      </div>
                      {used ? (
                        <Button size="small" type="text" danger icon={<LuTrash2 size={14} />} onClick={() => setDanger({ item: m, usedIn })} />
                      ) : (
                        <Popconfirm
                          title="Xoá ảnh này?"
                          description="Ảnh bị xoá vĩnh viễn và giải phóng dung lượng."
                          okText="Xoá"
                          okButtonProps={{ danger: true }}
                          cancelText="Giữ lại"
                          onConfirm={() => remove(m)}
                        >
                          <Button size="small" type="text" danger icon={<LuTrash2 size={14} />} />
                        </Popconfirm>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <Modal
        open={!!danger}
        title={<span className="text-red-600">Ảnh đang được sử dụng!</span>}
        okText="Vẫn xoá"
        okButtonProps={{ danger: true, loading: busy }}
        cancelText="Giữ lại"
        onOk={() => danger && remove(danger.item, true)}
        onCancel={() => setDanger(null)}
        destroyOnHidden
      >
        {danger && (
          <div className="space-y-2 text-sm">
            <div className="text-red-600">
              Ảnh <b>{danger.item.fileName}</b> đang xuất hiện
              {danger.usedIn.length ? " ở:" : " trong sản phẩm / giao diện / thiết kế."}
            </div>
            {danger.usedIn.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {danger.usedIn.map((k) => (
                  <Tag key={k} color="red">
                    {usedInLabel(k)}
                  </Tag>
                ))}
              </div>
            )}
            <div className="text-slate-600">Xoá sẽ làm ảnh bị hỏng (hiện ô trống) trên Mini App. Không thể hoàn tác.</div>
          </div>
        )}
      </Modal>
    </div>
  );
}
