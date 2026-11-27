import { App as AntApp, Button, Collapse, ColorPicker, ConfigProvider, Empty, Input, InputNumber, Segmented, Select, Slider, Switch, Tabs, Tooltip } from "antd";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { ApiError } from "../data/platform-api";
import { uploadStoreMedia } from "../data/media-api";
import { LuArrowDown, LuArrowUp, LuCopy, LuEye, LuEyeOff, LuFingerprint, LuMousePointerClick, LuPalette, LuPlus, LuSettings, LuTrash2, LuUpload } from "react-icons/lu";
import { Icon, ICON_OPTIONS } from "./icons";
import { StampIconPicker } from "./StampIconPicker";
import type { BlockAction } from "./PhoneFrame";
import { BLOCKS, uid } from "./registry";
import { DEFAULT_BUILDER_AUTH } from "./types";
import type { Block, BlockItem, BlockProps, BuilderAuthConfig, BuilderPage, BuilderSchema, BuilderTheme, FieldDef, ItemFieldDef, Selection } from "./types";

interface InspectorProps {
  schema: BuilderSchema;
  page: BuilderPage;
  selection: Selection | null;
  onSelect: (sel: Selection | null) => void;
  onPatchBlock: (blockId: string, patch: Partial<BlockProps>) => void;
  onRenameBlock: (blockId: string, name: string) => void;
  onPatchItem: (blockId: string, itemId: string, patch: Partial<BlockItem>) => void;
  onSetItems: (blockId: string, items: BlockItem[]) => void;
  onBlockAction: (blockId: string, action: BlockAction) => void;
  onPatchPage: (pageId: string, patch: Partial<BuilderPage>) => void;
  onPatchTheme: (patch: Partial<BuilderTheme>) => void;
  onPatchAuth: (patch: Partial<BuilderAuthConfig>) => void;
  onPreviewAuthSheet?: (tab: "login" | "register") => void;
}

const Label = ({ children }: { children: React.ReactNode }) => (
  <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{children}</div>
);

/** storeId của gian hàng đang thiết kế — ảnh tải lên được lưu ở máy chủ thay vì nhúng data URL. */
export const BuilderStoreContext = createContext<string | undefined>(undefined);

/** Nén ảnh phía client (giảm byte tải lên) → Blob. */
export async function compressImageToBlob(file: File, maxWidth = 1080): Promise<Blob> {
  const dataUrl = await compressImageToDataUrl(file, maxWidth);
  return (await fetch(dataUrl)).blob();
}

function compressImageToDataUrl(file: File, maxWidth = 1080): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Không thể đọc file ảnh"));
    reader.onload = () => {
      const src = String(reader.result || "");
      const img = new Image();
      img.onerror = () => resolve(src);
      img.onload = () => {
        const ratio = img.width > maxWidth ? maxWidth / img.width : 1;
        const w = Math.max(1, Math.round(img.width * ratio));
        const h = Math.max(1, Math.round(img.height * ratio));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(src);
        ctx.drawImage(img, 0, 0, w, h);
        const mime = file.type === "image/png" ? "image/png" : "image/jpeg";
        resolve(canvas.toDataURL(mime, 0.84));
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}

function ImageFieldControl({ value, onChange }: { value?: string; onChange: (v: string | undefined) => void }) {
  const { message } = AntApp.useApp();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const storeId = useContext(BuilderStoreContext);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      message.error("Vui lòng chọn đúng file hình ảnh (JPG, PNG, WebP...)");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      message.error("Ảnh quá lớn (tối đa 10MB)");
      return;
    }
    setUploading(true);
    try {
      if (!storeId) {
        message.error("Chưa xác định gian hàng để lưu ảnh");
        return;
      }
      const blob = await compressImageToBlob(file);
      const ext = blob.type === "image/png" ? "png" : "jpg";
      const url = await uploadStoreMedia(storeId, blob, `design-${Date.now()}.${ext}`, "general");
      onChange(url);
      message.success("Đã tải ảnh lên!");
    } catch (e) {
      // 413: vượt hạn mức dung lượng gói — không chèn ảnh
      message.error(e instanceof ApiError ? (e.status === 413 && e.quota ? `${e.message || "Vượt hạn mức dung lượng"} — hãy xoá bớt ảnh hoặc nâng cấp gói.` : e.message) : "Tải ảnh thất bại");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      {value ? (
        <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
          <img src={value} alt="Preview" className="h-24 w-full object-cover" />
          <div className="absolute right-1.5 top-1.5 flex gap-1">
            <Button size="small" icon={<LuUpload size={12} />} loading={uploading} onClick={() => inputRef.current?.click()}>
              Đổi
            </Button>
            <Button size="small" danger icon={<LuTrash2 size={12} />} onClick={() => onChange(undefined)} />
          </div>
        </div>
      ) : (
        <Button
          size="small"
          type="dashed"
          block
          icon={<LuUpload size={13} />}
          loading={uploading}
          onClick={() => inputRef.current?.click()}
        >
          Tải ảnh từ máy tính
        </Button>
      )}
      <Input
        size="small"
        allowClear
        placeholder="Hoặc dán URL ảnh (https://...)"
        value={value?.startsWith("data:") ? "" : (value ?? "")}
        onChange={(e) => onChange(e.target.value || undefined)}
      />
    </div>
  );
}

/** Thu ảnh về PNG vuông tối đa 128px (giữ nền trong suốt; SVG được vẽ thành PNG) */
function imageToIconPng(file: File, size = 128): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    const fail = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Không đọc được ảnh"));
    };
    img.onerror = fail;
    img.onload = () => {
      // SVG không khai báo kích thước → coi như hình vuông
      const w = img.naturalWidth || size;
      const h = img.naturalHeight || size;
      const scale = size / Math.max(w, h);
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return fail();
      ctx.drawImage(img, (size - w * scale) / 2, (size - h * scale) / 2, w * scale, h * scale);
      URL.revokeObjectURL(url);
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Không đọc được ảnh"))), "image/png");
    };
    img.src = url;
  });
}

function IconImageControl({ value, onChange }: { value?: string; onChange: (v: string | undefined) => void }) {
  const { message } = AntApp.useApp();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const storeId = useContext(BuilderStoreContext);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      message.error("Vui lòng chọn file hình ảnh (PNG, SVG, WebP...)");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      message.error("Biểu tượng quá lớn (tối đa 2MB)");
      return;
    }
    if (!storeId) {
      message.error("Chưa xác định gian hàng để lưu ảnh");
      return;
    }
    setUploading(true);
    try {
      const blob = await imageToIconPng(file);
      onChange(await uploadStoreMedia(storeId, blob, `stamp-icon-${Date.now()}.png`, "general"));
      message.success("Đã tải biểu tượng lên!");
    } catch (err) {
      message.error(err instanceof Error && err.message ? err.message : "Tải ảnh thất bại");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input ref={inputRef} type="file" accept="image/png,image/svg+xml,image/webp,image/gif,image/jpeg" className="hidden" onChange={handleFile} />
      <div className="flex items-center gap-2">
        {value && (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-100">
            <img src={value} alt="Biểu tượng đã tải" className="h-6 w-6 object-contain" />
          </span>
        )}
        <Button size="small" type="dashed" className="flex-1" icon={<LuUpload size={13} />} loading={uploading} onClick={() => inputRef.current?.click()}>
          {value ? "Đổi ảnh" : "Tải ảnh lên"}
        </Button>
        {value && (
          <Tooltip title="Bỏ ảnh">
            <Button size="small" danger aria-label="Bỏ ảnh" icon={<LuTrash2 size={13} />} onClick={() => onChange(undefined)} />
          </Tooltip>
        )}
      </div>
      <div className="mt-1 text-[11px] text-slate-400">Nên dùng PNG / SVG nền trong suốt, hình vuông.</div>
    </div>
  );
}

function FieldControl({ field, value: raw, theme, onChange }: { field: FieldDef; value: unknown; theme: BuilderTheme; onChange: (v: unknown) => void }) {
  const value = raw ?? (typeof field.fallback === "function" ? field.fallback(theme) : field.fallback);
  switch (field.kind) {
    case "text":
      return <Input size="small" value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />;
    case "textarea":
      return <Input.TextArea size="small" autoSize={{ minRows: 2, maxRows: 4 }} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />;
    case "number":
      return <InputNumber size="small" className="w-full" min={field.min} max={field.max} value={(value as number) ?? undefined} onChange={(v) => onChange(v ?? undefined)} />;
    case "slider":
      return (
        <div className="flex items-center gap-3">
          <Slider className="!my-1 flex-1" min={field.min} max={field.max} step={field.step ?? 1} value={(value as number) ?? field.min} onChange={(v) => onChange(v)} />
          <span className="min-w-9 text-right text-xs font-semibold tabular-nums text-slate-600">
            {(value as number) ?? field.min}
            {field.unit}
          </span>
        </div>
      );
    case "select":
      return (field.options?.length ?? 0) <= 3 ? (
        <Segmented size="small" block value={(value as string) ?? field.options?.[0]?.value} options={field.options ?? []} onChange={(v) => onChange(v)} />
      ) : (
        <Select size="small" className="w-full" value={value as string} options={field.options} onChange={(v) => onChange(v)} />
      );
    case "switch":
      return <Switch size="small" checked={!!value} onChange={(v) => onChange(v)} />;
    case "color":
      return (
        <ColorPicker
          size="small"
          showText
          allowClear
          value={(value as string) || null}
          // Lưu mã hex (antd trả chuỗi rgb()); bấm xoá → quay về màu mặc định
          onChange={(c) => onChange(c.cleared ? undefined : c.toHexString())}
          onClear={() => onChange(undefined)}
        />
      );
    case "image":
      return <ImageFieldControl value={value as string | undefined} onChange={(v) => onChange(v)} />;
    case "stampIcon":
      return <StampIconPicker value={value as string | undefined} onChange={onChange} />;
    case "iconImage":
      return <IconImageControl value={value as string | undefined} onChange={onChange} />;
    default:
      return null;
  }
}

function ItemFieldControl({ field, value, onChange }: { field: ItemFieldDef; value: unknown; onChange: (v: unknown) => void }) {
  if (field.kind === "image") return <ImageFieldControl value={value as string | undefined} onChange={(v) => onChange(v)} />;
  if (field.kind === "number") return <InputNumber size="small" className="w-full" min={0} step={1000} value={(value as number) ?? undefined} onChange={(v) => onChange(v ?? undefined)} />;
  if (field.kind === "color") return <ColorPicker size="small" showText value={(value as string) || "#1657f3"} onChange={(_, hex) => onChange(hex)} />;
  if (field.kind === "icon")
    return (
      <Select
        size="small"
        className="w-full"
        showSearch
        value={value as string}
        onChange={(v) => onChange(v)}
        options={ICON_OPTIONS.map((o) => ({
          value: o.value,
          label: (
            <span className="flex items-center gap-2">
              <Icon name={o.value} size={14} /> {o.label}
            </span>
          ),
        }))}
        filterOption={(input, opt) => String(opt?.value ?? "").includes(input.toLowerCase())}
      />
    );
  return <Input size="small" value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />;
}

function BlockInspector({ block, props }: { block: Block; props: InspectorProps }) {
  const meta = BLOCKS[block.type];
  const fields = meta.fields.filter((f) => !f.showIf || f.showIf(block.props));
  const contentFields = fields.filter((f) => f.group !== "style");
  const styleFields = fields.filter((f) => f.group === "style");
  /** Công tắc & chọn màu nằm cùng hàng với nhãn, còn lại nhãn ở trên */
  const renderField = (f: FieldDef) => {
    const control = (
      <FieldControl
        field={f}
        // Đang dùng ảnh tự tải → không đánh dấu biểu tượng có sẵn nào
        value={f.kind === "stampIcon" && block.props.stampIconImage ? "" : block.props[f.key]}
        theme={props.schema.theme}
        // Chọn biểu tượng có sẵn → bỏ ảnh tự tải (nếu không ảnh vẫn che biểu tượng vừa chọn)
        onChange={(v) => props.onPatchBlock(block.id, { [f.key]: v, ...(f.kind === "stampIcon" ? { stampIconImage: undefined } : null) } as Partial<BlockProps>)}
      />
    );
    return f.kind === "switch" || f.kind === "color" ? (
      <div key={f.key} className="flex items-center justify-between gap-2">
        <span className="text-xs text-slate-600">{f.label}</span>
        {control}
      </div>
    ) : (
      <div key={f.key}>
        <Label>{f.label}</Label>
        {control}
      </div>
    );
  };
  const items = block.props.items ?? [];
  const selectedItemId = props.selection?.itemId;
  const usesStoreSource =
    (block.type === "productGrid" ||
      block.type === "productList" ||
      block.type === "flashSale" ||
      block.type === "policyList" ||
      block.type === "voucherList") &&
    block.props.source !== "manual";

  const moveItem = (idx: number, dir: -1 | 1) => {
    const next = [...items];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    props.onSetItems(block.id, next);
  };

  const addItem = () => {
    const base: BlockItem = { ...(items[items.length - 1] ?? { label: "" }), id: uid("i"), label: `${meta.itemLabel ?? "Mục"} mới` };
    props.onSetItems(block.id, [...items, base]);
    props.onSelect({ blockId: block.id, itemId: base.id });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500 text-white">
            <Icon name={meta.icon} size={17} />
          </span>
          <div className="min-w-0 flex-1">
            <Input
              size="small"
              variant="borderless"
              className="!px-0 !text-sm !font-bold"
              value={block.name ?? ""}
              placeholder={meta.label}
              onChange={(e) => props.onRenameBlock(block.id, e.target.value)}
            />
            <div className="text-[11px] text-slate-500">{meta.description}</div>
          </div>
        </div>
        <div className="mt-2.5 flex gap-1">
          <Tooltip title="Di chuyển lên">
            <Button size="small" icon={<LuArrowUp size={13} />} onClick={() => props.onBlockAction(block.id, "up")} />
          </Tooltip>
          <Tooltip title="Di chuyển xuống">
            <Button size="small" icon={<LuArrowDown size={13} />} onClick={() => props.onBlockAction(block.id, "down")} />
          </Tooltip>
          <Tooltip title="Nhân bản">
            <Button size="small" icon={<LuCopy size={13} />} onClick={() => props.onBlockAction(block.id, "duplicate")} />
          </Tooltip>
          <Tooltip title={block.hidden ? "Hiện khối" : "Ẩn khối"}>
            <Button size="small" icon={block.hidden ? <LuEye size={13} /> : <LuEyeOff size={13} />} onClick={() => props.onBlockAction(block.id, "hide")} />
          </Tooltip>
          <div className="flex-1" />
          <Button size="small" danger icon={<LuTrash2 size={13} />} onClick={() => props.onBlockAction(block.id, "delete")}>
            Xoá
          </Button>
        </div>
      </div>

      {contentFields.length > 0 && (
        <section className="space-y-3">
          <div className="text-xs font-bold text-slate-800">Nội dung</div>
          {contentFields.map(renderField)}
        </section>
      )}

      {meta.itemFields && !usesStoreSource && (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <div className="text-xs font-bold text-slate-800">
              {meta.itemLabel ?? "Mục"} <span className="font-medium text-slate-400">({items.length})</span>
            </div>
            <Button size="small" type="dashed" icon={<LuPlus size={13} />} onClick={addItem}>
              Thêm
            </Button>
          </div>
          <Collapse
            size="small"
            accordion
            activeKey={selectedItemId}
            onChange={(k) => {
              const key = Array.isArray(k) ? k[0] : k;
              props.onSelect(key ? { blockId: block.id, itemId: String(key) } : { blockId: block.id });
            }}
            items={items.map((it, idx) => ({
              key: it.id,
              label: (
                <span className="flex items-center gap-2 text-xs font-semibold">
                  {it.icon && <Icon name={it.icon} size={13} />}
                  {it.color && !it.icon && <span className="h-3 w-3 rounded-full" style={{ background: it.color }} />}
                  <span className="truncate">{it.label || "(chưa đặt tên)"}</span>
                </span>
              ),
              extra: (
                <span className="flex gap-0.5" onClick={(e) => e.stopPropagation()}>
                  <Button size="small" type="text" icon={<LuArrowUp size={12} />} onClick={() => moveItem(idx, -1)} />
                  <Button size="small" type="text" icon={<LuArrowDown size={12} />} onClick={() => moveItem(idx, 1)} />
                  <Button
                    size="small"
                    type="text"
                    danger
                    icon={<LuTrash2 size={12} />}
                    onClick={() => props.onSetItems(block.id, items.filter((x) => x.id !== it.id))}
                  />
                </span>
              ),
              children: (
                <div className="space-y-2.5">
                  {meta.itemFields!.map((f) => (
                    <div key={f.key}>
                      <Label>{f.label}</Label>
                      <ItemFieldControl field={f} value={it[f.key]} onChange={(v) => props.onPatchItem(block.id, it.id, { [f.key]: v } as Partial<BlockItem>)} />
                    </div>
                  ))}
                </div>
              ),
            }))}
          />
        </section>
      )}

      {usesStoreSource && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-[11.5px] text-emerald-800">
          {block.type === "policyList" ? (
            <>
              Khối đang đồng bộ trực tiếp từ mục <b>Thư viện &amp; Tài liệu</b>. Chuyển nguồn sang &quot;Nhập tay&quot; nếu muốn tự nhập từng dòng.
            </>
          ) : block.type === "voucherList" ? (
            <>
              Khối đang đồng bộ trực tiếp từ <b>Hạng &amp; Voucher</b>. Chuyển nguồn sang &quot;Nhập tay&quot; nếu muốn tự tạo mã hiển thị riêng.
            </>
          ) : (
            <>
              Khối đang lấy dữ liệu trực tiếp từ <b>Sản phẩm của Store</b>. Chuyển nguồn sang &quot;Nhập tay&quot; để tuỳ chỉnh từng sản phẩm.
            </>
          )}
        </div>
      )}

      {styleFields.length > 0 && (
        <section className="space-y-3 border-t border-slate-100 pt-3">
          <div className="text-xs font-bold text-slate-800">Kiểu hiển thị</div>
          {styleFields.map(renderField)}
        </section>
      )}
    </div>
  );
}

function PageInspector({ page, props }: { page: BuilderPage; props: InspectorProps }) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-center text-[11.5px] text-slate-500">
        <LuMousePointerClick className="mx-auto mb-1 text-sky-500" size={20} />
        Click vào bất kỳ thành phần nào trên điện thoại để chỉnh sửa. Click lần nữa vào chữ để sửa trực tiếp.
      </div>
      <div className="text-xs font-bold text-slate-800">Cài đặt trang</div>
      <div>
        <Label>Tên trang</Label>
        <Input size="small" value={page.name} onChange={(e) => props.onPatchPage(page.id, { name: e.target.value })} />
      </div>
      <div>
        <Label>Đường dẫn (route)</Label>
        <Input size="small" prefix={<span className="text-slate-400">zalo://</span>} value={page.route} onChange={(e) => props.onPatchPage(page.id, { route: e.target.value })} />
      </div>
      <div>
        <Label>Icon trên Tabbar</Label>
        <ItemFieldControl field={{ key: "icon", label: "Icon", kind: "icon" }} value={page.icon} onChange={(v) => props.onPatchPage(page.id, { icon: String(v) })} />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-600">Hiển thị trên thanh Tabbar</span>
        <Switch size="small" checked={page.inTabbar} onChange={(v) => props.onPatchPage(page.id, { inTabbar: v })} />
      </div>
      <div>
        <Label>Màu nền trang</Label>
        <ColorPicker
          size="small"
          showText
          allowClear
          value={page.bgColor || props.schema.theme.bg}
          onChange={(_, hex) => props.onPatchPage(page.id, { bgColor: hex })}
          onClear={() => props.onPatchPage(page.id, { bgColor: undefined })}
        />
      </div>
      <div>
        <Label>AppBar (Thanh tiêu đề trên)</Label>
        <Select
          size="small"
          className="w-full"
          value={page.appBarStyle ?? "inherit"}
          onChange={(v) => props.onPatchPage(page.id, { appBarStyle: v })}
          options={[
            { value: "inherit", label: "Theo cài đặt giao diện chung" },
            { value: "white", label: "Nền trắng chuẩn" },
            { value: "primary", label: "Tràn màu lên tận đỉnh" },
            { value: "transparent", label: "Trong suốt (Tràn nền full)" },
          ]}
        />
      </div>
      {page.appBarStyle !== "transparent" && (
        <div>
          <Label>Màu nền AppBar riêng (tuỳ chọn)</Label>
          <ColorPicker
            size="small"
            showText
            allowClear
            value={page.appBarBg || undefined}
            onChange={(_, hex) => props.onPatchPage(page.id, { appBarBg: hex })}
            onClear={() => props.onPatchPage(page.id, { appBarBg: undefined })}
          />
        </div>
      )}
      <div className="rounded-xl bg-slate-50 p-3 text-[11.5px] text-slate-600">
        Trang có <b>{page.blocks.length}</b> khối · <b>{page.blocks.filter((b) => b.hidden).length}</b> đang ẩn
      </div>
    </div>
  );
}

const THEME_SWATCHES = ["#111827", "#1657f3", "#0f4c81", "#7c4a2d", "#be185d", "#059669", "#7c3aed", "#ea580c"];

function ThemeInspector({ schema, onPatchTheme }: { schema: BuilderSchema; onPatchTheme: InspectorProps["onPatchTheme"] }) {
  const t = schema.theme;
  return (
    <div className="space-y-4">
      <div>
        <Label>Màu chủ đạo nhanh</Label>
        <div className="flex flex-wrap gap-2">
          {THEME_SWATCHES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onPatchTheme({ primary: c })}
              className={`h-7 w-7 rounded-full ring-offset-2 transition ${t.primary.toLowerCase() === c ? "ring-2 ring-sky-500" : "hover:scale-110"}`}
              style={{ background: c }}
            />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3">
        {(
          [
            ["primary", "Màu chủ đạo"],
            ["accent", "Màu nhấn"],
            ["bg", "Màu nền ứng dụng"],
          ] as const
        ).map(([k, label]) => (
          <div key={k} className="flex items-center justify-between">
            <span className="text-xs text-slate-600">{label}</span>
            <ColorPicker size="small" showText value={t[k]} onChange={(c) => onPatchTheme({ [k]: c.toHexString() } as Partial<BuilderTheme>)} />
          </div>
        ))}
      </div>
      <div>
        <Label>Bo góc thẻ ({t.radius}px)</Label>
        <Slider min={0} max={28} value={t.radius} onChange={(v) => onPatchTheme({ radius: v })} />
      </div>
      <div>
        <Label>Font chữ</Label>
        <Select
          size="small"
          className="w-full"
          value={t.font}
          onChange={(v) => onPatchTheme({ font: v })}
          options={[
            { value: "Inter", label: "Inter" },
            { value: "Be Vietnam Pro", label: "Be Vietnam Pro" },
            { value: "system", label: "Hệ thống (SF / Roboto)" },
          ]}
        />
      </div>
      <div>
        <Label>Kiểu AppBar (Tràn nền trên)</Label>
        <Segmented
          size="small"
          block
          value={t.appBarStyle ?? "white"}
          onChange={(v) => onPatchTheme({ appBarStyle: v as BuilderTheme["appBarStyle"] })}
          options={[
            { value: "white", label: "Trắng" },
            { value: "primary", label: "Tràn màu" },
            { value: "transparent", label: "Tràn nền" },
          ]}
        />
      </div>
      {(t.appBarStyle ?? "white") !== "transparent" && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-600">Màu nền AppBar</span>
          <ColorPicker
            size="small"
            showText
            allowClear
            value={t.appBarBg || (t.appBarStyle === "primary" ? t.primary : "#ffffff")}
            onChange={(_, hex) => onPatchTheme({ appBarBg: hex })}
            onClear={() => onPatchTheme({ appBarBg: undefined })}
          />
        </div>
      )}
      <div>
        <Label>Màu chữ Status / AppBar</Label>
        <Segmented
          size="small"
          block
          value={t.appBarText ?? "auto"}
          onChange={(v) => onPatchTheme({ appBarText: v as BuilderTheme["appBarText"] })}
          options={[
            { value: "auto", label: "Tự động" },
            { value: "dark", label: "Tối" },
            { value: "light", label: "Trắng" },
          ]}
        />
      </div>
      <div className="space-y-3 border-t border-slate-100 pt-3">
        <div className="text-xs font-bold text-slate-800">Thanh điều hướng dưới (Bottom Nav)</div>
        <div>
          <Label>Kiểu Bottom Nav</Label>
          <Segmented
            size="small"
            block
            value={t.tabbarStyle}
            onChange={(v) => onPatchTheme({ tabbarStyle: v as BuilderTheme["tabbarStyle"] })}
            options={[
              { value: "classic", label: "Cổ điển" },
              { value: "floating", label: "Nổi" },
              { value: "minimal", label: "Pill" },
              { value: "indicator", label: "Gạch trên" },
            ]}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-600">Màu nền Bottom Nav</span>
          <ColorPicker
            size="small"
            showText
            allowClear
            value={t.tabbarBg || (t.tabbarStyle === "floating" ? "#0f172a" : "#ffffff")}
            onChange={(_, hex) => onPatchTheme({ tabbarBg: hex })}
            onClear={() => onPatchTheme({ tabbarBg: undefined })}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-600">Màu tab đang chọn</span>
          <ColorPicker
            size="small"
            showText
            allowClear
            value={t.tabbarActiveColor || (t.tabbarStyle === "floating" && !t.tabbarBg ? "#ffffff" : t.primary)}
            onChange={(_, hex) => onPatchTheme({ tabbarActiveColor: hex })}
            onClear={() => onPatchTheme({ tabbarActiveColor: undefined })}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-600">Màu tab chưa chọn</span>
          <ColorPicker
            size="small"
            showText
            allowClear
            value={t.tabbarInactiveColor || "#94a3b8"}
            onChange={(_, hex) => onPatchTheme({ tabbarInactiveColor: hex })}
            onClear={() => onPatchTheme({ tabbarInactiveColor: undefined })}
          />
        </div>
        <div>
          <Label>Bo góc Bottom Nav ({t.tabbarRadius ?? (t.tabbarStyle === "floating" ? 22 : 0)}px)</Label>
          <Slider
            min={0}
            max={32}
            value={t.tabbarRadius ?? (t.tabbarStyle === "floating" ? 22 : 0)}
            onChange={(v) => onPatchTheme({ tabbarRadius: v })}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-600">Hiện tên dưới icon</span>
          <Switch
            size="small"
            checked={t.tabbarShowLabel !== false}
            onChange={(v) => onPatchTheme({ tabbarShowLabel: v })}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-600">Hiện viền / bóng đổ</span>
          <Switch
            size="small"
            checked={t.tabbarBorder !== false}
            onChange={(v) => onPatchTheme({ tabbarBorder: v })}
          />
        </div>
      </div>
    </div>
  );
}

function AuthInspector({
  schema,
  onPatchAuth,
  onPreviewAuthSheet,
}: {
  schema: BuilderSchema;
  onPatchAuth: InspectorProps["onPatchAuth"];
  onPreviewAuthSheet?: InspectorProps["onPreviewAuthSheet"];
}) {
  const auth = schema.auth ?? DEFAULT_BUILDER_AUTH;
  const setProtected = (key: keyof BuilderAuthConfig["protectedActions"], val: boolean) =>
    onPatchAuth({ protectedActions: { ...auth.protectedActions, [key]: val } });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div>
          <div className="text-xs font-bold text-slate-900">Bật Đăng nhập &amp; Hội viên</div>
          <div className="text-[11px] text-slate-500">Cho phép khách đăng nhập / tích điểm trên Mini App</div>
        </div>
        <Switch size="small" checked={auth.enabled} onChange={(v) => onPatchAuth({ enabled: v })} />
      </div>

      {onPreviewAuthSheet && (
        <div className="grid grid-cols-2 gap-2">
          <Button size="small" icon={<LuEye size={12} />} onClick={() => onPreviewAuthSheet("login")}>
            Xem Đăng nhập
          </Button>
          <Button size="small" icon={<LuEye size={12} />} onClick={() => onPreviewAuthSheet("register")}>
            Xem Đăng ký
          </Button>
        </div>
      )}

      <div className="space-y-2.5 border-t border-slate-100 pt-3">
        <div className="text-xs font-bold text-slate-800">Phương thức đăng nhập &amp; đăng ký</div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-600">Đăng nhập 1 chạm bằng Zalo</span>
          <Switch size="small" checked={auth.allowZaloQuickLogin} onChange={(v) => onPatchAuth({ allowZaloQuickLogin: v })} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-600">Đăng nhập bằng SĐT / OTP</span>
          <Switch size="small" checked={auth.allowPhoneOtp} onChange={(v) => onPatchAuth({ allowPhoneOtp: v })} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-600">Yêu cầu cấp SĐT Zalo</span>
          <Switch size="small" checked={auth.requirePhoneVerify} onChange={(v) => onPatchAuth({ requirePhoneVerify: v })} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-600">Gợi ý quan tâm Zalo OA</span>
          <Switch size="small" checked={auth.requireFollowOa} onChange={(v) => onPatchAuth({ requireFollowOa: v })} />
        </div>
        <div>
          <Label>Điểm thưởng đăng ký thành viên mới</Label>
          <InputNumber
            size="small"
            className="w-full"
            min={0}
            step={10}
            value={auth.welcomePoints}
            onChange={(v) => onPatchAuth({ welcomePoints: Number(v ?? 0) })}
          />
        </div>
      </div>

      <div className="space-y-2.5 border-t border-slate-100 pt-3">
        <div className="text-xs font-bold text-slate-800">Chức năng yêu cầu đăng nhập hội viên</div>
        <div className="text-[11px] text-slate-500">
          Khi bật, khách bấm các nút tương ứng trong chế độ Preview sẽ hiện popup yêu cầu đăng nhập.
        </div>
        {(
          [
            ["checkout", "Đặt hàng / Thêm vào giỏ"],
            ["booking", "Đặt lịch hẹn dịch vụ"],
            ["voucher", "Lưu & sử dụng Voucher"],
            ["memberCard", "Đổi quà / Thẻ thành viên"],
            ["form", "Gửi biểu mẫu / Nộp hồ sơ"],
          ] as const
        ).map(([k, label]) => (
          <div key={k} className="flex items-center justify-between">
            <span className="text-xs text-slate-700">{label}</span>
            <Switch size="small" checked={auth.protectedActions[k]} onChange={(v) => setProtected(k, v)} />
          </div>
        ))}
      </div>

      <div className="space-y-2.5 border-t border-slate-100 pt-3">
        <div className="text-xs font-bold text-slate-800">Nội dung màn hình Đăng nhập</div>
        <div>
          <Label>Tiêu đề popup</Label>
          <Input size="small" value={auth.loginTitle} onChange={(e) => onPatchAuth({ loginTitle: e.target.value })} />
        </div>
        <div>
          <Label>Mô tả quyền lợi</Label>
          <Input.TextArea
            size="small"
            autoSize={{ minRows: 2, maxRows: 4 }}
            value={auth.loginSubtitle}
            onChange={(e) => onPatchAuth({ loginSubtitle: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}

export function Inspector(props: InspectorProps) {
  const block = props.selection ? props.page.blocks.find((b) => b.id === props.selection!.blockId) : undefined;
  // Chọn khối / trang khác → tab Thuộc tính cuộn về đầu (các tab khác giữ nguyên)
  const propsTopRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    propsTopRef.current?.closest(".ant-tabs-content")?.scrollTo({ top: 0 });
  }, [block?.id, props.page?.id]);
  return (
    <ConfigProvider
      theme={{
        token: { fontSize: 12, fontSizeSM: 12 },
        components: { Tabs: { titleFontSizeSM: 12, horizontalItemGutter: 14, horizontalItemPaddingSM: "8px 0" } },
      }}
    >
      <Tabs
        size="small"
        className="builder-inspector text-[12px]"
        tabBarStyle={{ marginBottom: 0 }}
        items={[
          {
            key: "props",
            label: (
              <span className="inline-flex items-center gap-1 text-[12px]">
                <LuSettings size={12} /> Thuộc tính
              </span>
            ),
            children: (
              <div ref={propsTopRef}>
                {block ? <BlockInspector key={block.id} block={block} props={props} /> : props.page ? <PageInspector page={props.page} props={props} /> : <Empty />}
              </div>
            ),
          },
          {
            key: "theme",
            label: (
              <span className="inline-flex items-center gap-1 text-[12px]">
                <LuPalette size={12} /> Giao diện
              </span>
            ),
            children: <ThemeInspector schema={props.schema} onPatchTheme={props.onPatchTheme} />,
          },
          {
            key: "auth",
            label: (
              <span className="inline-flex items-center gap-1 text-[12px]">
                <LuFingerprint size={12} /> Hội viên
              </span>
            ),
            children: (
              <AuthInspector
                schema={props.schema}
                onPatchAuth={props.onPatchAuth}
                onPreviewAuthSheet={props.onPreviewAuthSheet}
              />
            ),
          },
        ]}
      />
    </ConfigProvider>
  );
}
