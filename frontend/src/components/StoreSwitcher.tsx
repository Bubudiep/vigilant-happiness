import { Input, Popover } from "antd";
import { useState } from "react";
import { LuCheck, LuChevronsUpDown, LuPlus, LuSearch } from "react-icons/lu";
import { demoTemplates } from "../data/site";
import type { StoreWithOwner } from "../data/store-api";

const StoreAvatar = ({ store, size = 32 }: { store: StoreWithOwner; size?: number }) => (
  <span
    className="flex shrink-0 items-center justify-center rounded-lg font-black text-white"
    style={{ background: store.theme?.primary || "#1657f3", width: size, height: size, fontSize: size * 0.42 }}
  >
    {store.name.trim().slice(0, 1).toUpperCase()}
  </span>
);

const templateName = (id: string) => demoTemplates.find((t) => t.id === id)?.name ?? id;

/** Nút chọn store trên thanh trên cùng: tên + trạng thái, danh sách có tìm kiếm, nút tạo store ở cuối. */
export default function StoreSwitcher({
  stores,
  current,
  showOwner,
  onSelect,
  onCreate,
}: {
  stores: StoreWithOwner[];
  current: StoreWithOwner;
  /** Quản trị viên thấy store của nhiều khách → hiện tên khách sở hữu */
  showOwner: boolean;
  onSelect: (id: string) => void;
  onCreate: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [kw, setKw] = useState("");
  const k = kw.trim().toLowerCase();
  const list = stores.filter(
    (s) => !k || `${s.name} ${s.slug} ${s.customer?.companyName ?? ""} ${s.customer?.name ?? ""}`.toLowerCase().includes(k),
  );
  const sub = (s: StoreWithOwner) =>
    showOwner ? s.customer?.companyName || s.customer?.name || "Chưa gắn khách" : templateName(s.templateId);

  const content = (
    <div className="w-[300px]">
      {stores.length > 5 && (
        <Input
          allowClear
          autoFocus
          size="small"
          value={kw}
          onChange={(e) => setKw(e.target.value)}
          prefix={<LuSearch size={13} className="text-slate-400" />}
          placeholder="Tìm store…"
          className="mb-2"
        />
      )}
      <div className="px-1 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
        {showOwner ? `Tất cả store (${stores.length})` : "Store của bạn"}
      </div>
      <div className="max-h-[320px] space-y-0.5 overflow-y-auto">
        {list.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => {
              onSelect(s.id);
              setOpen(false);
              setKw("");
            }}
            className={`flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left transition ${
              s.id === current.id ? "bg-brand-50" : "hover:bg-slate-50"
            }`}
          >
            <StoreAvatar store={s} size={30} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-sm font-semibold text-slate-900">{s.name}</span>
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${s.active ? "bg-emerald-500" : "bg-slate-300"}`} />
              </div>
              <div className="truncate text-[11px] text-slate-500">{sub(s)}</div>
            </div>
            {s.id === current.id && <LuCheck size={15} className="shrink-0 text-brand-600" />}
          </button>
        ))}
        {list.length === 0 && <div className="py-4 text-center text-xs text-slate-400">Không tìm thấy store</div>}
      </div>
      <div className="mt-1.5 border-t border-slate-100 pt-1.5">
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            onCreate();
          }}
          className="flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left text-sm font-semibold text-brand-600 transition hover:bg-brand-50"
        >
          <span className="flex h-[30px] w-[30px] items-center justify-center rounded-lg border border-dashed border-brand-600/50">
            <LuPlus size={15} />
          </span>
          Tạo store mới
        </button>
      </div>
    </div>
  );

  return (
    <Popover open={open} onOpenChange={setOpen} trigger="click" placement="bottomRight" arrow={false} content={content}>
      <button
        type="button"
        className="flex max-w-[220px] items-center gap-2 rounded-xl border border-slate-200 bg-white py-1 pl-1 pr-2 text-left transition hover:border-slate-300 hover:bg-slate-50 sm:max-w-[260px]"
      >
        <StoreAvatar store={current} size={28} />
        <div className="hidden min-w-0 leading-tight sm:block">
          <div className="truncate text-xs font-bold text-slate-900">{current.name}</div>
          <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-500">
            <span className={`h-1.5 w-1.5 rounded-full ${current.active ? "bg-emerald-500" : "bg-slate-300"}`} />
            <span className="truncate">{current.active ? "Đang hoạt động" : "Tạm tắt"} · {sub(current)}</span>
          </div>
        </div>
        <LuChevronsUpDown size={14} className="shrink-0 text-slate-400" />
      </button>
    </Popover>
  );
}
