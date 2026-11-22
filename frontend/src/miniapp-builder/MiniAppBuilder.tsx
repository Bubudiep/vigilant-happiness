import { App as AntApp, Badge, Button, ConfigProvider, Dropdown, Input, Modal, Popover, QRCode, Select, Tabs, Tooltip } from "antd";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  LuChevronRight,
  LuCode,
  LuCopy,
  LuDownload,
  LuEye,
  LuEyeOff,
  LuFiles,
  LuGripVertical,
  LuLayers,
  LuLayoutTemplate,
  LuMaximize2,
  LuMinimize2,
  LuMousePointerClick,
  LuPencil,
  LuPlus,
  LuQrCode,
  LuRedo2,
  LuSend,
  LuSmartphone,
  LuTrash2,
  LuUndo2,
} from "react-icons/lu";
import type { DocumentLike, ProductLike, VoucherLike } from "./blocks";
import { Icon } from "./icons";
import { Inspector } from "./Inspector";
import { BlockAction, DeviceFrame, DeviceId, DEVICES, DND_MOVE, DND_NEW, PhoneScreen } from "./PhoneFrame";
import { cloneBlock, createSchemaFromPreset, PRESET_CATEGORIES, PRESETS } from "./presets";
import type { PresetCategory } from "./presets";
import { BLOCK_CATEGORIES, BLOCKS, uid } from "./registry";
import { DEFAULT_BUILDER_AUTH } from "./types";
import type { Block, BlockItem, BlockProps, BlockType, BuilderAuthConfig, BuilderPage, BuilderSchema, BuilderTheme, Selection } from "./types";

export interface MiniAppBuilderProps {
  brand: string;
  initialSchema: BuilderSchema;
  products: ProductLike[];
  documents?: DocumentLike[];
  vouchers?: VoucherLike[];
  previewUrl?: string;
  onPublish?: () => void;
  onChange: (schema: BuilderSchema) => void;
}

interface History {
  past: BuilderSchema[];
  present: BuilderSchema;
  future: BuilderSchema[];
}

const PAGE_TEMPLATES: { key: string; label: string; icon: string; blocks: BlockType[] }[] = [
  { key: "blank", label: "Trang trống", icon: "file", blocks: [] },
  { key: "catalog", label: "Danh sách sản phẩm", icon: "grid", blocks: ["search", "categories", "productGrid"] },
  { key: "promo", label: "Khuyến mãi", icon: "gift", blocks: ["notice", "banner", "flashSale"] },
  { key: "booking", label: "Đặt lịch", icon: "calendar", blocks: ["booking", "form"] },
  { key: "contact", label: "Liên hệ", icon: "map", blocks: ["contact", "news"] },
  { key: "account", label: "Tài khoản", icon: "user", blocks: ["profile", "memberCard", "menuList"] },
];

const frameSize = (d: DeviceId) => {
  const dev = DEVICES[d];
  const bezel = d === "iphoneSE" ? 14 : 12;
  return { w: dev.width + bezel * 2, h: dev.height + bezel * 2 + (d === "iphoneSE" ? 120 : 0) };
};

const newBlock = (type: BlockType): Block => ({ id: uid(type.slice(0, 3)), type, props: BLOCKS[type].defaults() });

export function MiniAppBuilder({ brand, initialSchema, products, documents, vouchers, previewUrl, onPublish, onChange }: MiniAppBuilderProps) {
  const { message, modal } = AntApp.useApp();
  const [hist, setHist] = useState<History>({ past: [], present: initialSchema, future: [] });
  const schema = hist.present;
  const lastCommit = useRef<{ key?: string; t: number }>({ t: 0 });

  const [activePageId, setActivePageId] = useState(initialSchema.pages[0]?.id ?? "");
  const [selection, setSelection] = useState<Selection | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [device, setDevice] = useState<DeviceId>("iphone15");
  const [zoom, setZoom] = useState<"fit" | number>("fit");
  const [leftTab, setLeftTab] = useState<"pages" | "layers" | "library">("layers");
  const [templateOpen, setTemplateOpen] = useState(false);
  const [presetCategory, setPresetCategory] = useState<"all" | PresetCategory>("all");
  const [codeOpen, setCodeOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [renamingPage, setRenamingPage] = useState<string | null>(null);
  const [dragPageId, setDragPageId] = useState<string | null>(null);
  const [dragLayer, setDragLayer] = useState<{ id: string; over?: number } | null>(null);
  const [authPreviewTab, setAuthPreviewTab] = useState<"login" | "register" | null>(null);

  const page = schema.pages.find((p) => p.id === activePageId) ?? schema.pages[0];

  /* ---------------- history ---------------- */
  const commit = useCallback((fn: (s: BuilderSchema) => BuilderSchema, coalesceKey?: string) => {
    const now = Date.now();
    const coalesce = !!coalesceKey && lastCommit.current.key === coalesceKey && now - lastCommit.current.t < 900;
    lastCommit.current = { key: coalesceKey, t: now };
    setHist((h) => {
      const next = { ...fn(h.present), updatedAt: new Date().toISOString() };
      return coalesce ? { ...h, present: next, future: [] } : { past: [...h.past.slice(-80), h.present], present: next, future: [] };
    });
  }, []);

  const undo = useCallback(() => {
    lastCommit.current = { t: 0 };
    setHist((h) => (h.past.length ? { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future] } : h));
  }, []);
  const redo = useCallback(() => {
    lastCommit.current = { t: 0 };
    setHist((h) => (h.future.length ? { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) } : h));
  }, []);

  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    onChange(schema);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schema]);

  // Giữ activePage hợp lệ sau undo/redo
  useEffect(() => {
    if (!schema.pages.some((p) => p.id === activePageId) && schema.pages[0]) setActivePageId(schema.pages[0].id);
    if (selection && !schema.pages.some((p) => p.blocks.some((b) => b.id === selection.blockId))) setSelection(null);
  }, [schema, activePageId, selection]);

  /* ---------------- mutations ---------------- */
  const patchPage = useCallback(
    (pageId: string, fn: (p: BuilderPage) => BuilderPage, key?: string) =>
      commit((s) => ({ ...s, pages: s.pages.map((p) => (p.id === pageId ? fn(p) : p)) }), key),
    [commit],
  );

  const patchBlocks = useCallback(
    (fn: (blocks: Block[]) => Block[], key?: string) => page && patchPage(page.id, (p) => ({ ...p, blocks: fn(p.blocks) }), key),
    [page, patchPage],
  );

  const onPatchBlock = (blockId: string, patch: Partial<BlockProps>) =>
    patchBlocks((bs) => bs.map((b) => (b.id === blockId ? { ...b, props: { ...b.props, ...patch } } : b)), `blk:${blockId}:${Object.keys(patch).join()}`);

  const onRenameBlock = (blockId: string, name: string) =>
    patchBlocks((bs) => bs.map((b) => (b.id === blockId ? { ...b, name: name || undefined } : b)), `name:${blockId}`);

  const onPatchItem = (blockId: string, itemId: string, patch: Partial<BlockItem>) =>
    patchBlocks(
      (bs) =>
        bs.map((b) =>
          b.id === blockId ? { ...b, props: { ...b.props, items: (b.props.items ?? []).map((it) => (it.id === itemId ? { ...it, ...patch } : it)) } } : b,
        ),
      `item:${itemId}:${Object.keys(patch).join()}`,
    );

  const onSetItems = (blockId: string, items: BlockItem[]) =>
    patchBlocks((bs) => bs.map((b) => (b.id === blockId ? { ...b, props: { ...b.props, items } } : b)));

  const onBlockAction = useCallback(
    (blockId: string, action: BlockAction) => {
      patchBlocks((bs) => {
        const i = bs.findIndex((b) => b.id === blockId);
        if (i < 0) return bs;
        const next = [...bs];
        if (action === "up" && i > 0) [next[i - 1], next[i]] = [next[i], next[i - 1]];
        if (action === "down" && i < next.length - 1) [next[i + 1], next[i]] = [next[i], next[i + 1]];
        if (action === "hide") next[i] = { ...next[i], hidden: !next[i].hidden };
        if (action === "delete") next.splice(i, 1);
        if (action === "duplicate") {
          const copy = cloneBlock(next[i]);
          next.splice(i + 1, 0, copy);
          setTimeout(() => setSelection({ blockId: copy.id }), 0);
        }
        return next;
      });
      if (action === "delete") setSelection(null);
    },
    [patchBlocks],
  );

  const insertBlock = (type: BlockType, index?: number) => {
    const b = newBlock(type);
    patchBlocks((bs) => {
      const next = [...bs];
      const selIdx = selection ? bs.findIndex((x) => x.id === selection.blockId) : -1;
      const at = index ?? (selIdx >= 0 ? selIdx + 1 : bs.length);
      next.splice(at, 0, b);
      return next;
    });
    setSelection({ blockId: b.id });
    message.success({ content: `Đã thêm "${BLOCKS[type].label}"`, duration: 1.2 });
  };

  const moveBlockTo = (blockId: string, index: number) =>
    patchBlocks((bs) => {
      const from = bs.findIndex((b) => b.id === blockId);
      if (from < 0) return bs;
      const next = [...bs];
      const [item] = next.splice(from, 1);
      next.splice(from < index ? index - 1 : index, 0, item);
      return next;
    });

  const onDropAt = (index: number, data: { newType?: string; moveId?: string }) => {
    if (data.newType && data.newType in BLOCKS) insertBlock(data.newType as BlockType, index);
    else if (data.moveId) moveBlockTo(data.moveId, index);
  };

  const onPatchTheme = (patch: Partial<BuilderTheme>) => commit((s) => ({ ...s, theme: { ...s.theme, ...patch } }), `theme:${Object.keys(patch).join()}`);

  const onPatchAuth = (patch: Partial<BuilderAuthConfig>) =>
    commit((s) => ({ ...s, auth: { ...(s.auth ?? DEFAULT_BUILDER_AUTH), ...patch } }), `auth:${Object.keys(patch).join()}`);

  const addPage = (tplKey: string) => {
    const tpl = PAGE_TEMPLATES.find((t) => t.key === tplKey) ?? PAGE_TEMPLATES[0];
    const p: BuilderPage = {
      id: uid("pg"),
      name: tpl.key === "blank" ? `Trang ${schema.pages.length + 1}` : tpl.label,
      route: `/${tpl.key}-${schema.pages.length + 1}`,
      icon: tpl.icon,
      inTabbar: false,
      blocks: tpl.blocks.map(newBlock),
    };
    commit((s) => ({ ...s, pages: [...s.pages, p] }));
    setActivePageId(p.id);
    setSelection(null);
    setRenamingPage(p.id);
  };

  const removePage = (pageId: string) => {
    if (schema.pages.length <= 1) return message.warning("Mini App cần ít nhất 1 trang");
    commit((s) => ({ ...s, pages: s.pages.filter((p) => p.id !== pageId) }));
  };

  const duplicatePage = (pageId: string) => {
    const src = schema.pages.find((p) => p.id === pageId);
    if (!src) return;
    const copy: BuilderPage = { ...src, id: uid("pg"), name: `${src.name} (bản sao)`, route: `${src.route}-copy`, inTabbar: false, blocks: src.blocks.map(cloneBlock) };
    commit((s) => {
      const i = s.pages.findIndex((p) => p.id === pageId);
      const next = [...s.pages];
      next.splice(i + 1, 0, copy);
      return { ...s, pages: next };
    });
    setActivePageId(copy.id);
  };

  const reorderPage = (dragId: string, targetId: string) =>
    commit((s) => {
      const from = s.pages.findIndex((p) => p.id === dragId);
      const to = s.pages.findIndex((p) => p.id === targetId);
      if (from < 0 || to < 0 || from === to) return s;
      const next = [...s.pages];
      const [it] = next.splice(from, 1);
      next.splice(to, 0, it);
      return { ...s, pages: next };
    });

  const applyPreset = (presetId: string) => {
    const preset = PRESETS.find((p) => p.id === presetId);
    modal.confirm({
      title: `Áp dụng mẫu "${preset?.name}"?`,
      content: "Toàn bộ trang và bố cục hiện tại sẽ được thay thế. Bạn vẫn có thể hoàn tác (Ctrl+Z).",
      okText: "Áp dụng mẫu",
      cancelText: "Huỷ",
      onOk: () => {
        const next = createSchemaFromPreset(presetId, brand);
        commit(() => next);
        setActivePageId(next.pages[0].id);
        setSelection(null);
        setTemplateOpen(false);
        message.success(`Đã áp dụng mẫu ${preset?.name}`);
      },
    });
  };

  /* ---------------- keyboard ---------------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      const typing = el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z" && !typing) {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (mod && e.key.toLowerCase() === "y" && !typing) {
        e.preventDefault();
        redo();
      } else if (!typing && selection && (e.key === "Delete" || e.key === "Backspace")) {
        e.preventDefault();
        onBlockAction(selection.blockId, "delete");
      } else if (!typing && selection && mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        onBlockAction(selection.blockId, "duplicate");
      } else if (e.key === "Escape" && !typing) {
        if (fullscreen && !selection) setFullscreen(false);
        setSelection(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, selection, onBlockAction, fullscreen]);

  /* ---------------- canvas scale ---------------- */
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 600, h: 800 });
  useLayoutEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setCanvasSize({ w: entry.contentRect.width, h: entry.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const fs = frameSize(device);
  const fitScale = Math.min(1, (canvasSize.h - 104) / fs.h, (canvasSize.w - 32) / fs.w);
  const scale = zoom === "fit" ? Math.max(0.38, fitScale) : zoom;

  const selectedBlock = selection ? page?.blocks.find((b) => b.id === selection.blockId) : undefined;
  const selectedItem = selectedBlock && selection?.itemId ? selectedBlock.props.items?.find((i) => i.id === selection.itemId) : undefined;
  const json = useMemo(() => (codeOpen ? JSON.stringify(schema, null, 2) : ""), [codeOpen, schema]);

  if (!page) return null;

  /* ---------------- left panels ---------------- */
  const pagesPanel = (
    <div className="space-y-1">
      {schema.pages.map((p) => {
        const active = p.id === page.id;
        return (
          <div
            key={p.id}
            draggable={renamingPage !== p.id}
            onDragStart={() => setDragPageId(p.id)}
            onDragEnd={() => setDragPageId(null)}
            onDragOver={(e) => dragPageId && e.preventDefault()}
            onDrop={() => {
              if (dragPageId) reorderPage(dragPageId, p.id);
              setDragPageId(null);
            }}
            onClick={() => {
              setActivePageId(p.id);
              setSelection(null);
            }}
            onDoubleClick={() => setRenamingPage(p.id)}
            className={`group flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] transition ${
              active ? "bg-sky-50 font-semibold text-sky-700 ring-1 ring-sky-200" : "text-slate-700 hover:bg-slate-50"
            } ${dragPageId === p.id ? "opacity-40" : ""}`}
          >
            <LuGripVertical size={13} className="shrink-0 cursor-grab text-slate-300 group-hover:text-slate-400" />
            <Icon name={p.icon} size={15} className="shrink-0" />
            {renamingPage === p.id ? (
              <Input
                size="small"
                autoFocus
                defaultValue={p.name}
                onClick={(e) => e.stopPropagation()}
                onBlur={(e) => {
                  patchPage(p.id, (pg) => ({ ...pg, name: e.target.value.trim() || pg.name }));
                  setRenamingPage(null);
                }}
                onPressEnter={(e) => (e.target as HTMLInputElement).blur()}
              />
            ) : (
              <span className="min-w-0 flex-1 truncate">{p.name}</span>
            )}
            {p.inTabbar && renamingPage !== p.id && (
              <Tooltip title="Có trên Tabbar">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
              </Tooltip>
            )}
            <Dropdown
              trigger={["click"]}
              menu={{
                items: [
                  { key: "rename", label: "Đổi tên", icon: <LuPencil size={13} /> },
                  { key: "tab", label: p.inTabbar ? "Bỏ khỏi Tabbar" : "Đưa lên Tabbar", icon: <LuSmartphone size={13} /> },
                  { key: "dup", label: "Nhân bản trang", icon: <LuCopy size={13} /> },
                  { type: "divider" },
                  { key: "del", label: "Xoá trang", icon: <LuTrash2 size={13} />, danger: true },
                ],
                onClick: ({ key, domEvent }) => {
                  domEvent.stopPropagation();
                  if (key === "rename") setRenamingPage(p.id);
                  if (key === "tab") patchPage(p.id, (pg) => ({ ...pg, inTabbar: !pg.inTabbar }));
                  if (key === "dup") duplicatePage(p.id);
                  if (key === "del") removePage(p.id);
                },
              }}
            >
              <button type="button" onClick={(e) => e.stopPropagation()} className="rounded px-1 text-slate-400 opacity-0 hover:bg-slate-200 group-hover:opacity-100">
                ⋯
              </button>
            </Dropdown>
          </div>
        );
      })}
      <Dropdown
        trigger={["click"]}
        menu={{
          items: PAGE_TEMPLATES.map((t) => ({ key: t.key, label: t.label, icon: <Icon name={t.icon} size={14} /> })),
          onClick: ({ key }) => addPage(key),
        }}
      >
        <Button type="dashed" block size="small" icon={<LuPlus size={13} />} className="!mt-2">
          Thêm trang
        </Button>
      </Dropdown>
      <p className="px-1 pt-2 text-[11px] leading-relaxed text-slate-400">Kéo để sắp xếp thứ tự trang · Double-click để đổi tên · Tối đa 5 trang trên Tabbar.</p>
    </div>
  );

  const layersPanel = (
    <div>
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{page.name}</span>
        <span className="text-[11px] text-slate-400">{page.blocks.length} khối</span>
      </div>
      {page.blocks.length === 0 && <div className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">Chưa có khối nào. Mở tab Thư viện để thêm.</div>}
      <div className="space-y-0.5">
        {page.blocks.map((b, idx) => {
          const meta = BLOCKS[b.type];
          const active = selection?.blockId === b.id;
          return (
            <div key={b.id}>
              {dragLayer && dragLayer.over === idx && <div className="mx-1 h-0.5 rounded bg-sky-500" />}
              <div
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData(DND_MOVE, b.id);
                  setDragLayer({ id: b.id });
                }}
                onDragEnd={() => setDragLayer(null)}
                onDragOver={(e) => {
                  e.preventDefault();
                  const r = e.currentTarget.getBoundingClientRect();
                  const over = e.clientY < r.top + r.height / 2 ? idx : idx + 1;
                  setDragLayer((d) => (d ? { ...d, over } : { id: "", over }));
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const over = dragLayer?.over ?? idx;
                  const newType = e.dataTransfer.getData(DND_NEW);
                  if (newType) insertBlock(newType as BlockType, over);
                  else if (dragLayer?.id) moveBlockTo(dragLayer.id, over);
                  setDragLayer(null);
                }}
                onClick={() => setSelection({ blockId: b.id })}
                onMouseEnter={() => setHoverId(b.id)}
                onMouseLeave={() => setHoverId(null)}
                className={`group flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-[12.5px] transition ${
                  active ? "bg-sky-500 text-white shadow-sm" : hoverId === b.id ? "bg-sky-50 text-slate-800" : "text-slate-700 hover:bg-slate-50"
                } ${dragLayer?.id === b.id ? "opacity-40" : ""} ${b.hidden ? "italic" : ""}`}
              >
                <LuGripVertical size={13} className={`shrink-0 cursor-grab ${active ? "text-white/70" : "text-slate-300"}`} />
                <Icon name={meta.icon} size={14} className="shrink-0" />
                <span className={`min-w-0 flex-1 truncate ${b.hidden ? "opacity-50" : ""}`}>{b.name || meta.label}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onBlockAction(b.id, "hide");
                  }}
                  className={`shrink-0 ${b.hidden ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                >
                  {b.hidden ? <LuEyeOff size={13} /> : <LuEye size={13} />}
                </button>
              </div>
            </div>
          );
        })}
        {dragLayer && dragLayer.over === page.blocks.length && <div className="mx-1 h-0.5 rounded bg-sky-500" />}
      </div>
    </div>
  );

  const libraryPanel = (
    <div className="space-y-4">
      {BLOCK_CATEGORIES.map((cat) => (
        <div key={cat}>
          <div className="mb-1.5 px-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">{cat}</div>
          <div className="grid grid-cols-2 gap-1.5">
            {Object.values(BLOCKS)
              .filter((m) => m.category === cat)
              .map((m) => (
                <Tooltip key={m.type} title={m.description} placement="right" mouseEnterDelay={0.4}>
                  <div
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData(DND_NEW, m.type);
                      e.dataTransfer.effectAllowed = "copy";
                    }}
                    onClick={() => insertBlock(m.type)}
                    className="group flex cursor-grab flex-col items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-1.5 py-2.5 text-center transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md active:cursor-grabbing"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition group-hover:bg-sky-500 group-hover:text-white">
                      <Icon name={m.icon} size={16} />
                    </span>
                    <span className="text-[11px] font-semibold leading-tight text-slate-700">{m.label}</span>
                  </div>
                </Tooltip>
              ))}
          </div>
        </div>
      ))}
    </div>
  );

  /* ---------------- render ---------------- */
  return (
    <div className={fullscreen ? "fixed inset-0 z-[60] flex flex-col bg-slate-100 p-3" : "flex flex-col"}>
      {/* Toolbar */}
      <ConfigProvider theme={{ token: { fontSize: 12, fontSizeSM: 12, controlHeightSM: 26 } }}>
        <div className="mb-2.5 flex flex-wrap items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-2.5 py-1.5 text-[12px] shadow-sm">
          <Button size="small" icon={<LuLayoutTemplate size={13} />} onClick={() => setTemplateOpen(true)}>
            Mẫu
          </Button>
          <div className="mx-0.5 hidden h-5 w-px bg-slate-200 sm:block" />
          <Select
            size="small"
            value={device}
            onChange={(v) => setDevice(v as DeviceId)}
            style={{ width: 124 }}
            options={(Object.keys(DEVICES) as DeviceId[]).map((d) => ({ value: d, label: DEVICES[d].label }))}
          />
          <Select
            size="small"
            value={zoom === "fit" ? "fit" : String(zoom)}
            onChange={(v) => setZoom(v === "fit" ? "fit" : Number(v))}
            style={{ width: 70 }}
            options={[
              { value: "fit", label: "Vừa" },
              { value: "0.75", label: "75%" },
              { value: "1", label: "100%" },
            ]}
          />
          <div className="flex-1" />
          <Tooltip title="Hoàn tác (Ctrl+Z)">
            <Button size="small" icon={<LuUndo2 size={13} />} disabled={!hist.past.length} onClick={undo} />
          </Tooltip>
          <Tooltip title="Làm lại (Ctrl+Shift+Z)">
            <Button size="small" icon={<LuRedo2 size={13} />} disabled={!hist.future.length} onClick={redo} />
          </Tooltip>
          <Tooltip title={mode === "preview" ? "Tắt chế độ Preview" : "Bật chế độ Preview"}>
            <Button
              size="small"
              type={mode === "preview" ? "primary" : "default"}
              icon={mode === "preview" ? <LuEyeOff size={13} /> : <LuEye size={13} />}
              onClick={() => {
                setMode((m) => (m === "preview" ? "edit" : "preview"));
                setSelection(null);
              }}
            >
              Preview
            </Button>
          </Tooltip>
          <Tooltip title="Xem schema JSON">
            <Button size="small" icon={<LuCode size={13} />} onClick={() => setCodeOpen(true)} />
          </Tooltip>
          {previewUrl && (
            <Popover
              trigger="click"
              content={
                <div className="text-center">
                  <QRCode value={previewUrl} size={150} bordered={false} />
                  <div className="mt-1 text-xs text-slate-500">Quét bằng Zalo để xem trước Mini App</div>
                  <div className="text-[11px] text-slate-400">Thiết kế tự lưu — quét lại để thấy bản mới</div>
                </div>
              }
            >
              <Button size="small" icon={<LuQrCode size={13} />} />
            </Popover>
          )}
          <Tooltip title={fullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}>
            <Button size="small" icon={fullscreen ? <LuMinimize2 size={13} /> : <LuMaximize2 size={13} />} onClick={() => setFullscreen((f) => !f)} />
          </Tooltip>
          {onPublish && (
            <Button size="small" type="primary" icon={<LuSend size={12} />} onClick={onPublish} className="font-semibold">
              Xuất bản
            </Button>
          )}
        </div>
      </ConfigProvider>

      <div
        className="grid min-h-0 flex-1 gap-2.5 lg:grid-cols-[232px_minmax(0,1fr)_280px] 2xl:grid-cols-[256px_minmax(0,1fr)_316px]"
        style={{ height: fullscreen ? undefined : "calc(100vh - 120px)", minHeight: 480 }}
      >
        {/* Left panel */}
        <ConfigProvider
          theme={{
            token: { fontSize: 12, fontSizeSM: 12 },
            components: { Tabs: { titleFontSizeSM: 12, horizontalItemGutter: 16, horizontalItemPaddingSM: "8px 0" } },
          }}
        >
          <aside className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-[12px] shadow-sm">
            <div className="px-3">
              <Tabs
                size="small"
                activeKey={leftTab}
                onChange={(k) => setLeftTab(k as typeof leftTab)}
                tabBarStyle={{ marginBottom: 0 }}
                items={[
                  {
                    key: "pages",
                    label: (
                      <span className="inline-flex items-center gap-1 text-[12px]">
                        <LuFiles size={12} /> Trang
                      </span>
                    ),
                  },
                  {
                    key: "layers",
                    label: (
                      <span className="inline-flex items-center gap-1 text-[12px]">
                        <LuLayers size={12} /> Lớp
                      </span>
                    ),
                  },
                  {
                    key: "library",
                    label: (
                      <span className="inline-flex items-center gap-1 text-[12px]">
                        <LuPlus size={12} /> Thư viện
                      </span>
                    ),
                  },
                ]}
              />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-2.5">
              {leftTab === "pages" && pagesPanel}
              {leftTab === "layers" && layersPanel}
              {leftTab === "library" && libraryPanel}
            </div>
          </aside>
        </ConfigProvider>

        {/* Canvas */}
        <section
          ref={canvasRef}
          className="relative flex min-h-0 flex-col items-center overflow-auto rounded-2xl border border-slate-200 shadow-inner"
          style={{ backgroundColor: "#eef1f5", backgroundImage: "radial-gradient(#cbd5e1 1px, transparent 1px)", backgroundSize: "18px 18px" }}
          onClick={() => setSelection(null)}
        >
          {/* page pills */}
          <div className="sticky top-0 z-10 flex w-full justify-center gap-1 px-3 pb-2 pt-3">
            <div className="no-scrollbar flex max-w-full gap-1 overflow-x-auto rounded-full bg-white/90 p-1 shadow-sm ring-1 ring-slate-200 backdrop-blur" onClick={(e) => e.stopPropagation()}>
              {schema.pages.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setActivePageId(p.id);
                    setSelection(null);
                  }}
                  className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-[12px] font-semibold transition ${
                    p.id === page.id ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Icon name={p.icon} size={12} />
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-1 items-start justify-center pb-6 pt-2">
            <div style={{ width: fs.w * scale, height: fs.h * scale }} onClick={(e) => e.stopPropagation()}>
              <div style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: fs.w, height: fs.h }}>
                <DeviceFrame device={device}>
                  <PhoneScreen
                    schema={schema}
                    page={page}
                    products={products}
                    documents={documents}
                    vouchers={vouchers}
                    mode={mode}
                    device={device}
                    selection={selection}
                    hoverId={hoverId}
                    authPreviewTab={authPreviewTab}
                    onCloseAuthPreview={() => setAuthPreviewTab(null)}
                    onSelect={setSelection}
                    onHover={setHoverId}
                    onPatchBlock={onPatchBlock}
                    onPatchItem={onPatchItem}
                    onBlockAction={onBlockAction}
                    onDropAt={onDropAt}
                    onNavigate={(id) => {
                      setActivePageId(id);
                      setSelection(null);
                    }}
                  />
                </DeviceFrame>
              </div>
            </div>
          </div>

          {/* breadcrumb */}
          <div className="sticky bottom-3 z-10 mb-3 flex items-center gap-1 rounded-full bg-slate-900/90 px-3 py-1.5 text-[11.5px] text-white shadow-lg backdrop-blur" onClick={(e) => e.stopPropagation()}>
            <LuMousePointerClick size={13} className="text-sky-300" />
            <button type="button" className="hover:text-sky-300" onClick={() => setSelection(null)}>
              {page.name}
            </button>
            {selectedBlock && (
              <>
                <LuChevronRight size={12} className="text-white/40" />
                <button type="button" className="hover:text-sky-300" onClick={() => setSelection({ blockId: selectedBlock.id })}>
                  {selectedBlock.name || BLOCKS[selectedBlock.type].label}
                </button>
              </>
            )}
            {selectedItem && (
              <>
                <LuChevronRight size={12} className="text-white/40" />
                <span className="max-w-[140px] truncate text-sky-300">{selectedItem.label}</span>
              </>
            )}
            {!selectedBlock && <span className="ml-1 text-white/50">· {mode === "edit" ? "Click để chọn thành phần" : "Chế độ xem thử"}</span>}
          </div>
        </section>

        {/* Right inspector */}
        <aside className="min-h-0 overflow-y-auto rounded-2xl border border-slate-200 bg-white px-3.5 pb-4 shadow-sm">
          <Inspector
            schema={schema}
            page={page}
            selection={selection}
            onSelect={setSelection}
            onPatchBlock={onPatchBlock}
            onRenameBlock={onRenameBlock}
            onPatchItem={onPatchItem}
            onSetItems={onSetItems}
            onBlockAction={onBlockAction}
            onPatchPage={(pageId, patch) => patchPage(pageId, (p) => ({ ...p, ...patch }), `page:${pageId}:${Object.keys(patch).join()}`)}
            onPatchTheme={onPatchTheme}
            onPatchAuth={onPatchAuth}
            onPreviewAuthSheet={(tab) => setAuthPreviewTab(tab)}
          />
        </aside>
      </div>

      {/* Template gallery */}
      <Modal
        open={templateOpen}
        onCancel={() => setTemplateOpen(false)}
        footer={null}
        width={1120}
        title={
          <div className="flex items-center gap-2">
            <span>Thư viện mẫu Mini App</span>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">{PRESETS.length} mẫu</span>
          </div>
        }
        centered
        destroyOnHidden
      >
        <p className="-mt-1 mb-3 text-sm text-slate-500">Chọn một mẫu ngành nghề giống demo-mini-app-store làm điểm khởi đầu. Mọi trang, khối và màu sắc đều có thể tuỳ biến sau khi áp dụng.</p>
        <div className="mb-4 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setPresetCategory("all")}
            className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              presetCategory === "all"
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Tất cả ({PRESETS.length})
          </button>
          {PRESET_CATEGORIES.map((cat) => {
            const count = PRESETS.filter((p) => p.category === cat).length;
            if (count === 0) return null;
            const selected = presetCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setPresetCategory(cat)}
                className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  selected
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
        <div className="grid max-h-[65vh] gap-4 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-4">
          {PRESETS.filter((p) => presetCategory === "all" || p.category === presetCategory).map((p) => {
            const previewSchema = createSchemaFromPreset(p.id, brand);
            const active = schema.presetId === p.id;
            const thumbScale = 0.42;
            const dev = DEVICES.iphone15;
            return (
              <div key={p.id} className={`group overflow-hidden rounded-2xl border bg-white transition hover:shadow-xl ${active ? "border-sky-500 ring-2 ring-sky-200" : "border-slate-200"}`}>
                <div className="relative flex justify-center overflow-hidden pt-4" style={{ height: 290, background: `linear-gradient(160deg, ${p.theme.primary}22, ${p.theme.accent}22)` }}>
                  <div
                    className="pointer-events-none overflow-hidden rounded-[26px] border-[5px] border-slate-900 bg-white shadow-xl"
                    style={{ width: dev.width * thumbScale + 10, height: dev.height * thumbScale + 10 }}
                  >
                    <div style={{ width: dev.width, height: dev.height, transform: `scale(${thumbScale})`, transformOrigin: "top left" }}>
                      <PhoneScreen schema={previewSchema} page={previewSchema.pages[0]} products={products} mode="preview" device="iphone15" />
                    </div>
                  </div>
                  <span className="absolute left-2.5 top-2.5 rounded-md bg-white/90 px-2 py-0.5 text-[10px] font-bold tracking-wide text-slate-700 shadow-sm backdrop-blur-sm">
                    {p.code}
                  </span>
                  {active && (
                    <span className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-0.5 shadow-sm backdrop-blur-sm">
                      <Badge status="processing" text={<span className="text-[11px] font-semibold text-sky-700">Đang dùng</span>} />
                    </span>
                  )}
                </div>
                <div className="p-3.5">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: p.theme.primary }} />
                    <span className="truncate font-bold text-slate-900">{p.name}</span>
                  </div>
                  <div className="text-[11px] font-semibold text-slate-500">{p.industry}</div>
                  <p className="mt-1 line-clamp-2 min-h-[32px] text-xs text-slate-500">{p.description}</p>
                  <div className="mt-2 text-[11px] text-slate-400">{previewSchema.pages.length} trang · {previewSchema.pages.reduce((n, pg) => n + pg.blocks.length, 0)} khối</div>
                  <Button type={active ? "default" : "primary"} block className="mt-2.5" onClick={() => applyPreset(p.id)}>
                    {active ? "Áp dụng lại" : "Dùng mẫu này"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </Modal>

      {/* JSON schema */}
      <Modal
        open={codeOpen}
        onCancel={() => setCodeOpen(false)}
        width={760}
        title="Schema Mini App (JSON)"
        footer={[
          <Button
            key="copy"
            icon={<LuCopy size={14} />}
            onClick={() => {
              navigator.clipboard.writeText(json).then(() => message.success("Đã copy schema JSON"));
            }}
          >
            Copy
          </Button>,
          <Button
            key="dl"
            type="primary"
            icon={<LuDownload size={14} />}
            onClick={() => {
              const blob = new Blob([json], { type: "application/json" });
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = `${brand.toLowerCase().replace(/\s+/g, "-")}-miniapp.json`;
              a.click();
              URL.revokeObjectURL(a.href);
            }}
          >
            Tải xuống
          </Button>,
        ]}
      >
        <p className="mb-2 text-xs text-slate-500">Mini App runtime đọc schema này qua API <code>/api/stores/public/:slug</code> để render giao diện động.</p>
        <pre className="max-h-[60vh] overflow-auto rounded-xl bg-slate-950 p-4 text-[11.5px] leading-relaxed text-emerald-300">{json}</pre>
      </Modal>
    </div>
  );
}
