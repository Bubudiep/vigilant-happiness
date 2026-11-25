import { App as AntApp, Button, Empty, Modal, Popconfirm, Segmented, Spin, Tag } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LuRefreshCw, LuTrash2 } from "react-icons/lu";
import { fmtBytes } from "../data/format";
import { deleteStoreMedia, fetchStoreMedia } from "../data/media-api";
import { findMediaInUse, mediaUsage, StoreMediaItem, usedInLabel } from "../data/media-usage";
import { ApiError } from "../data/platform-api";
import type { StoreConfig } from "../data/store-api";
import { StorageBar } from "./AlbumViews";

const TYPES: { value: string; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "product", label: "Sản phẩm" },
  { value: "banner", label: "Banner" },
  { value: "logo", label: "Logo" },
  { value: "general", label: "Khác" },
  { value: "unused", label: "Chưa dùng" }, // lọc theo trạng thái dùng, không phải loại
];
const typeLabel = (t: string) => TYPES.find((x) => x.value === t)?.label ?? t;

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
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">Thư viện ảnh</h3>
            <p className="text-xs text-slate-500">
              Ảnh đã tải lên cho thiết kế, sản phẩm, banner. Xoá sản phẩm không tự xoá ảnh — ảnh thừa vẫn tính vào hạn mức dung lượng.
            </p>
          </div>
          <Button icon={<LuRefreshCw size={14} />} loading={loading} onClick={load}>
            Làm mới
          </Button>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <Segmented size="small" value={type} onChange={(v) => setType(String(v))} options={TYPES} />
          <span className="text-xs text-slate-500">
            {shown.length} ảnh · {fmtBytes(total)}
          </span>
        </div>

        <div className="mt-4">
          {!items ? (
            <div className="py-12 text-center">
              <Spin />
            </div>
          ) : shown.length === 0 ? (
            <Empty description="Chưa có ảnh nào" />
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
                        <div className="text-[11px] text-slate-500">
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
