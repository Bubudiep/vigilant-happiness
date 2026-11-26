import { App as AntApp, Button, Collapse, Form, Input, InputNumber, Modal, Popconfirm, Radio, Segmented, Switch, Table, Tag, Tooltip } from "antd";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LuClock, LuFlaskConical, LuHistory, LuPackage, LuPackagePlus, LuPlus, LuSearch, LuSparkles, LuTrash2 } from "react-icons/lu";
import { ApiError } from "../data/platform-api";
import {
  addStoreProduct,
  deleteStoreProduct,
  fetchInventory,
  type InventorySummary,
  isMaterial,
  isService,
  LOW_STOCK,
  type ProductKind,
  type StoreConfig,
  type StoreProductItem,
  updateStoreProduct,
} from "../data/store-api";
import { BomEditor, OptionsEditor, StockReceiptModal, StockReceiptsDrawer } from "./StoreInventoryViews";
import { FilterBar, FilterSelect, FORM_PROPS, FormFooter, FormGrid, PageHeader, StatCard, StatGrid } from "./ui";

export type StockState = "service" | "bom" | "out" | "low" | "ok";
const hasBom = (p: StoreProductItem) => !!p.bom?.length;
export const stockState = (p: StoreProductItem): StockState =>
  isService(p) && !hasBom(p) ? "service" : hasBom(p) ? "bom" : (p.stock ?? 0) <= 0 ? "out" : (p.stock ?? 0) <= LOW_STOCK ? "low" : "ok";

const KIND: Record<ProductKind, { label: string; color: string }> = {
  product: { label: "Sản phẩm", color: "blue" },
  service: { label: "Dịch vụ", color: "purple" },
  material: { label: "Nguyên liệu", color: "gold" },
};
const KIND_FILTERS = [
  { value: "all", label: "Tất cả" },
  { value: "product", label: "Sản phẩm" },
  { value: "service", label: "Dịch vụ" },
  { value: "material", label: "Nguyên liệu" },
];
const STOCK_FILTERS = [
  { value: "low", label: "Sắp hết hàng" },
  { value: "out", label: "Hết hàng" },
  { value: "ok", label: "Còn hàng" },
];

const money = (n: number) => `${Math.round(n).toLocaleString("vi-VN")}đ`;
const fmtDuration = (m?: number | null) => (!m ? "" : m < 60 ? `${m} phút` : `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}p` : ""}`);
const errMsg = (e: unknown, fb = "Thao tác thất bại") => (e instanceof ApiError ? e.message : fb);
const kindOf = (p: StoreProductItem): ProductKind => p.kind ?? "product";

type FormValues = Omit<StoreProductItem, "id">;

/**
 * Sản phẩm / Dịch vụ / Nguyên liệu + kho:
 * - Giá vốn (bình quân sau mỗi lần nhập kho), lãi gộp từng món, giá trị tồn kho.
 * - BOM: món làm từ nguyên liệu (bán 1 ly → trừ cà phê, sữa, ly); giá vốn = tổng nguyên liệu.
 * - Phân loại & bán kèm: size, topping… (giá cộng thêm, có thể trừ thêm nguyên liệu).
 * - Nhập kho (phiếu nhập) và lịch sử nhập.
 */
export function ProductsSection({
  store,
  onLocal,
}: {
  store: StoreConfig;
  onLocal: (updater: (s: StoreConfig) => StoreConfig) => void;
}) {
  const { message } = AntApp.useApp();
  const [kind, setKind] = useState("all");
  const [stockFilter, setStockFilter] = useState<string | undefined>();
  const [category, setCategory] = useState<string | undefined>();
  const [q, setQ] = useState("");
  const [modal, setModal] = useState<{ open: boolean; item?: StoreProductItem }>({ open: false });
  const [saving, setSaving] = useState(false);
  const [receipt, setReceipt] = useState<{ open: boolean; productId?: string }>({ open: false });
  const [history, setHistory] = useState(false);
  const [inv, setInv] = useState<InventorySummary | null>(null);
  const [form] = Form.useForm<FormValues>();
  const formKind = Form.useWatch("kind", form) as ProductKind | undefined;
  const formBom = (Form.useWatch("bom", form) ?? []) as unknown[];

  const loadInv = useCallback(() => {
    fetchInventory(store.id)
      .then(setInv)
      .catch(() => undefined);
  }, [store.id]);
  useEffect(() => {
    loadInv();
  }, [loadInv]);
  const invById = useMemo(() => new Map((inv?.items ?? []).map((i) => [i.id, i])), [inv]);
  const costOf = (p: StoreProductItem) => invById.get(p.id)?.unitCost ?? p.costPrice ?? 0;

  const products = store.products;
  const goods = products.filter((p) => kindOf(p) === "product");
  const services = products.filter(isService);
  const materials = products.filter(isMaterial);
  const low = products.filter((p) => stockState(p) === "low").length;
  const out = products.filter((p) => stockState(p) === "out").length;
  const categories = useMemo(() => [...new Set(products.map((p) => p.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, "vi")), [products]);

  const kw = q.trim().toLowerCase();
  const shown = products.filter(
    (p) =>
      (kind === "all" || kindOf(p) === kind) &&
      (!stockFilter || stockState(p) === stockFilter) &&
      (!category || p.category === category) &&
      (!kw || p.name.toLowerCase().includes(kw) || (p.sku ?? "").toLowerCase().includes(kw)),
  );

  const replace = (saved: StoreProductItem) => onLocal((s) => ({ ...s, products: s.products.map((p) => (p.id === saved.id ? saved : p)) }));
  const applyStock = (after: { id: string; stock: number; costPrice: number }[]) => {
    const m = new Map(after.map((a) => [a.id, a]));
    onLocal((s) => ({ ...s, products: s.products.map((p) => (m.has(p.id) ? { ...p, ...m.get(p.id)! } : p)) }));
    loadInv();
  };

  // ── Sửa nhanh tồn kho (kiểm kê): cập nhật ngay, chờ 0,6s không gõ nữa mới lưu ──
  const stockTimers = useRef<Record<string, number>>({});
  const changeStock = (p: StoreProductItem, stock: number) => {
    onLocal((s) => ({ ...s, products: s.products.map((x) => (x.id === p.id ? { ...x, stock } : x)) }));
    window.clearTimeout(stockTimers.current[p.id]);
    stockTimers.current[p.id] = window.setTimeout(async () => {
      try {
        replace(await updateStoreProduct(store.id, p.id, { stock }));
        loadInv();
      } catch (e) {
        message.error(errMsg(e, "Không lưu được tồn kho"));
        replace(p);
      }
    }, 600);
  };

  const patch = async (p: StoreProductItem, data: Partial<FormValues>) => {
    try {
      replace(await updateStoreProduct(store.id, p.id, data));
    } catch (e) {
      message.error(errMsg(e));
    }
  };

  const open = (item?: StoreProductItem, asKind: ProductKind = kind === "service" || kind === "material" ? (kind as ProductKind) : "product") => {
    setModal({ open: true, item });
    form.resetFields();
    form.setFieldsValue(
      item
        ? { ...item, kind: kindOf(item), bom: item.bom ?? [], options: item.options ?? [] }
        : {
            kind: asKind,
            name: "",
            category: asKind === "material" ? "Nguyên liệu" : (categories[0] ?? "Chung"),
            price: 0,
            costPrice: 0,
            stock: asKind === "service" ? undefined : 0,
            active: asKind !== "material",
            bom: [],
            options: [],
          },
    );
  };

  const save = async (values: FormValues) => {
    const bom = (values.bom ?? []).filter((l) => l?.productId && l.quantity);
    const data: Partial<FormValues> = {
      ...values,
      // Dịch vụ không quản lý kho; hàng hoá không có thời lượng; nguyên liệu không có BOM / tuỳ chọn / giá bán riêng
      ...(values.kind === "service" ? { stock: 0 } : { durationMin: null }),
      salePrice: values.salePrice ?? null,
      price: values.price ?? 0,
      costPrice: values.costPrice ?? 0,
      bom: values.kind === "material" ? [] : bom,
      options:
        values.kind === "material"
          ? []
          : (values.options ?? []).map((g) => ({
              ...g,
              max: g.multiple ? (g.max ?? null) : null,
              // Nguyên liệu dùng thêm của lựa chọn: bỏ dòng trống (chưa chọn nguyên liệu / chưa nhập SL)
              choices: (g.choices ?? []).map((c) => ({ ...c, price: c.price ?? 0, bom: (c.bom ?? []).filter((l) => l?.productId && l.quantity) })),
            })),
    };
    setSaving(true);
    try {
      if (modal.item) {
        replace(await updateStoreProduct(store.id, modal.item.id, data));
      } else {
        const saved = await addStoreProduct(store.id, data as FormValues);
        onLocal((s) => ({ ...s, products: [saved, ...s.products] }));
      }
      message.success(modal.item ? "Đã cập nhật" : `Đã thêm ${KIND[values.kind ?? "product"].label.toLowerCase()}`);
      setModal({ open: false });
      loadInv();
    } catch (e) {
      message.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (p: StoreProductItem) => {
    try {
      await deleteStoreProduct(store.id, p.id);
      onLocal((s) => ({ ...s, products: s.products.filter((x) => x.id !== p.id) }));
      message.success("Đã xoá");
      loadInv();
    } catch (e) {
      message.error(errMsg(e));
    }
  };

  return (
    <div className="space-y-4">
      <StatGrid>
        <StatCard
          label="Sản phẩm · Dịch vụ"
          icon={<LuPackage size={16} className="text-brand-600" />}
          value={`${goods.length} · ${services.length}`}
          hint={`${materials.length} nguyên liệu`}
        />
        <StatCard
          label="Giá trị tồn kho (giá vốn)"
          icon={<LuPackagePlus size={16} className="text-emerald-600" />}
          value={inv ? money(inv.stockValue) : "…"}
          hint={inv ? `Theo giá bán ${money(inv.saleValue)}` : " "}
        />
        <StatCard label="Sắp hết hàng" tone={low ? "warning" : "default"} value={low} hint={`Còn ≤ ${LOW_STOCK}`} />
        <StatCard label="Hết hàng" tone={out ? "danger" : "default"} value={out} hint={out ? "Cần nhập thêm" : "Không có"} />
      </StatGrid>

      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <PageHeader
          title="Sản phẩm & Dịch vụ"
          description="Giá bán, giá vốn & lãi, tồn kho, định mức nguyên liệu (BOM), size / topping. Tồn kho tự trừ khi đơn hoàn thành; nhập kho để cộng tồn và tính lại giá vốn."
        />
        <FilterBar
          search={<Input allowClear prefix={<LuSearch size={14} className="text-slate-400" />} placeholder="Tìm tên, SKU…" value={q} onChange={(e) => setQ(e.target.value)} />}
          filters={
            <>
              <Segmented value={kind} onChange={(v) => setKind(String(v))} options={KIND_FILTERS} />
              <FilterSelect allowClear placeholder="Danh mục" value={category} onChange={setCategory} options={categories.map((c) => ({ value: c, label: c }))} />
              {kind !== "service" && <FilterSelect allowClear placeholder="Tồn kho" value={stockFilter} onChange={setStockFilter} options={STOCK_FILTERS} />}
            </>
          }
          actions={
            <>
              <Tooltip title="Lịch sử nhập kho">
                <Button icon={<LuHistory size={14} />} onClick={() => setHistory(true)} aria-label="Lịch sử nhập kho" />
              </Tooltip>
              <Button icon={<LuPackagePlus size={14} />} onClick={() => setReceipt({ open: true })}>
                Nhập kho
              </Button>
              <Button icon={<LuFlaskConical size={14} />} onClick={() => open(undefined, "material")}>
                Nguyên liệu
              </Button>
              <Button icon={<LuSparkles size={14} />} onClick={() => open(undefined, "service")}>
                Dịch vụ
              </Button>
              <Button type="primary" icon={<LuPlus size={14} />} onClick={() => open(undefined, "product")}>
                Thêm sản phẩm
              </Button>
            </>
          }
        />
        <Table<StoreProductItem>
          rowKey="id"
          size="small"
          dataSource={shown}
          tableLayout="fixed"
          scroll={{ x: 1020 }}
          pagination={{ pageSize: 12, hideOnSinglePage: true, showSizeChanger: false }}
          columns={[
            {
              title: "Tên",
              render: (_, p) => (
                <div className="flex min-w-0 items-center gap-2.5">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt="" loading="lazy" className="h-9 w-9 shrink-0 rounded-lg border border-slate-200 object-cover" />
                  ) : (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                      {isService(p) ? <LuSparkles size={15} /> : isMaterial(p) ? <LuFlaskConical size={15} /> : <LuPackage size={15} />}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-slate-900" title={p.name}>
                      {p.name}
                    </div>
                    <div className="truncate text-xs text-slate-500">
                      {[p.category, p.sku && `SKU ${p.sku}`, p.unit, p.options?.length ? `${p.options.map((g) => g.name).join(", ")}` : null].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                </div>
              ),
            },
            {
              title: "Loại",
              width: 104,
              render: (_, p) => (
                <div className="flex flex-wrap gap-1">
                  <Tag color={KIND[kindOf(p)].color} className="!m-0">
                    {KIND[kindOf(p)].label}
                  </Tag>
                  {hasBom(p) && (
                    <Tooltip title={`Định mức: ${p.bom!.map((l) => `${products.find((x) => x.id === l.productId)?.name ?? "?"} ×${l.quantity}`).join(", ")}`}>
                      <Tag className="!m-0">BOM</Tag>
                    </Tooltip>
                  )}
                </div>
              ),
            },
            {
              title: "Giá bán",
              width: 110,
              align: "right",
              render: (_, p) =>
                isMaterial(p) ? (
                  <span className="text-slate-400">—</span>
                ) : (
                  <div className="tabular-nums">
                    <div className="font-semibold text-slate-900">{money(p.salePrice ?? p.price)}</div>
                    {p.salePrice != null && p.salePrice < p.price && <div className="text-xs text-slate-400 line-through">{money(p.price)}</div>}
                  </div>
                ),
            },
            {
              title: "Giá vốn · Lãi",
              width: 130,
              align: "right",
              render: (_, p) => {
                const cost = costOf(p);
                if (isMaterial(p)) return <span className="tabular-nums">{money(cost)}{p.unit ? <span className="text-xs text-slate-400">/{p.unit}</span> : null}</span>;
                const price = p.salePrice ?? p.price;
                if (!cost) return <span className="text-xs text-slate-400">Chưa có giá vốn</span>;
                const margin = price ? Math.round(((price - cost) / price) * 100) : 0;
                return (
                  <div className="tabular-nums">
                    <div className="text-slate-700">{money(cost)}</div>
                    <div className={`text-xs font-semibold ${margin < 0 ? "text-red-600" : margin < 20 ? "text-amber-600" : "text-emerald-600"}`}>
                      Lãi {money(price - cost)} · {margin}%
                    </div>
                  </div>
                );
              },
            },
            {
              title: "Tồn kho",
              width: 170,
              render: (_, p) => {
                const st = stockState(p);
                if (st === "service")
                  return (
                    <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                      <LuClock size={12} /> {fmtDuration(p.durationMin) || "Không quản lý kho"}
                    </span>
                  );
                if (st === "bom") {
                  const n = invById.get(p.id)?.makeable;
                  return (
                    <Tooltip title="Tính từ tồn nguyên liệu theo định mức">
                      <span className={`text-xs ${n === 0 ? "font-semibold text-red-600" : "text-slate-600"}`}>
                        Làm được <b className="tabular-nums">{n ?? "…"}</b>
                      </span>
                    </Tooltip>
                  );
                }
                return (
                  <div className="flex items-center gap-1.5">
                    <InputNumber size="small" precision={0} className="!w-20" value={p.stock ?? 0} onChange={(v) => changeStock(p, Number(v ?? 0))} />
                    {p.unit && isMaterial(p) && <span className="text-xs text-slate-400">{p.unit}</span>}
                    {st === "out" ? (
                      <Tag color="red" className="!m-0">
                        Hết
                      </Tag>
                    ) : st === "low" ? (
                      <Tag color="orange" className="!m-0">
                        Sắp hết
                      </Tag>
                    ) : null}
                    <Tooltip title="Nhập kho món này">
                      <Button size="small" type="text" icon={<LuPackagePlus size={13} />} onClick={() => setReceipt({ open: true, productId: p.id })} />
                    </Tooltip>
                  </div>
                );
              },
            },
            {
              title: "Hiển thị",
              width: 70,
              render: (_, p) => (isMaterial(p) ? <span className="text-xs text-slate-400">—</span> : <Switch size="small" checked={p.active} onChange={(active) => patch(p, { active })} />),
            },
            {
              title: "",
              width: 92,
              align: "right",
              render: (_, p) => (
                <div className="flex justify-end gap-1">
                  <Button size="small" onClick={() => open(p)}>
                    Sửa
                  </Button>
                  <Popconfirm title={`Xoá “${p.name}”?`} okText="Xoá" okButtonProps={{ danger: true }} cancelText="Huỷ" onConfirm={() => remove(p)}>
                    <Tooltip title="Xoá">
                      <Button size="small" danger icon={<LuTrash2 size={13} />} />
                    </Tooltip>
                  </Popconfirm>
                </div>
              ),
            },
          ]}
        />
      </div>

      <Modal
        title={modal.item ? `Sửa ${KIND[kindOf(modal.item)].label.toLowerCase()}` : `Thêm ${KIND[formKind ?? "product"].label.toLowerCase()}`}
        open={modal.open}
        onCancel={() => setModal({ open: false })}
        footer={null}
        width={720}
        destroyOnHidden
      >
        <Form form={form} {...FORM_PROPS} onFinish={save}>
          <Form.Item label="Loại" name="kind">
            <Radio.Group
              optionType="button"
              buttonStyle="solid"
              options={[
                { value: "product", label: "Sản phẩm (có tồn kho)" },
                { value: "service", label: "Dịch vụ (không tồn kho)" },
                { value: "material", label: "Nguyên liệu" },
              ]}
            />
          </Form.Item>
          <Form.Item label="Tên" name="name" rules={[{ required: true, message: "Nhập tên" }]}>
            <Input
              placeholder={formKind === "service" ? "VD: Siêu âm 5D, Gội đầu dưỡng sinh…" : formKind === "material" ? "VD: Cà phê hạt, Sữa đặc, Ly nhựa 500ml" : "VD: Cà phê sữa đá, Áo thun…"}
            />
          </Form.Item>
          <FormGrid cols={3}>
            <Form.Item label="Danh mục" name="category">
              <Input placeholder="Cà phê, Gói khám…" />
            </Form.Item>
            <Form.Item label="Đơn vị" name="unit" extra={formKind === "material" ? "Dùng đơn vị nhỏ: g, ml, cái" : undefined}>
              <Input placeholder={formKind === "service" ? "Lượt, Buổi…" : formKind === "material" ? "g, ml, cái" : "Ly, Hộp, Size M…"} />
            </Form.Item>
            {formKind === "service" ? (
              <Form.Item label="Thời lượng (phút)" name="durationMin">
                <InputNumber className="!w-full" min={0} step={15} placeholder="VD: 45" />
              </Form.Item>
            ) : (
              <Form.Item label="Mã SKU" name="sku">
                <Input />
              </Form.Item>
            )}
            {formKind !== "material" && (
              <>
                <Form.Item label="Giá bán (đ)" name="price" rules={[{ required: true, message: "Nhập giá" }]}>
                  <InputNumber className="!w-full" min={0} step={1000} />
                </Form.Item>
                <Form.Item label="Giá khuyến mãi (đ)" name="salePrice">
                  <InputNumber className="!w-full" min={0} step={1000} />
                </Form.Item>
              </>
            )}
            {!formBom.length && (
              <Form.Item label={formKind === "material" ? "Giá vốn / đơn vị (đ)" : "Giá vốn (đ)"} name="costPrice" extra="Tự cập nhật khi nhập kho">
                <InputNumber className="!w-full" min={0} step={100} />
              </Form.Item>
            )}
            {formKind !== "service" && !formBom.length && (
              <Form.Item label="Tồn kho hiện tại" name="stock" extra={modal.item ? "Sửa = kiểm kê; nên dùng Nhập kho" : undefined}>
                <InputNumber className="!w-full" precision={0} />
              </Form.Item>
            )}
            {formKind !== "material" && (
              <Form.Item label="Nhãn" name="tag">
                <Input placeholder="Bán chạy, Mới…" />
              </Form.Item>
            )}
          </FormGrid>
          {formKind !== "material" && (
            <Collapse
              size="small"
              className="!mb-4"
              defaultActiveKey={[...(modal.item?.bom?.length ? ["bom"] : []), ...(modal.item?.options?.length ? ["options"] : [])]}
              items={[
                {
                  key: "bom",
                  label: `Định mức nguyên liệu (BOM)${formBom.length ? ` · ${formBom.length}` : ""}`,
                  children: (
                    <>
                      <div className="mb-2 text-xs text-slate-500">Bán 1 {formKind === "service" ? "lượt" : "đơn vị"} sẽ trừ kho các nguyên liệu dưới đây; giá vốn = tổng giá vốn nguyên liệu.</div>
                      <BomEditor store={store} selfId={modal.item?.id} />
                    </>
                  ),
                },
                {
                  key: "options",
                  label: "Phân loại & bán kèm (size, topping…)",
                  children: (
                    <>
                      <div className="mb-2 text-xs text-slate-500">Khách chọn khi gọi món; giá lựa chọn cộng thêm vào giá bán. “Chọn 1” cho size / phân loại, “Chọn nhiều” cho topping.</div>
                      <OptionsEditor store={store} selfId={modal.item?.id} />
                    </>
                  ),
                },
              ]}
            />
          )}
          {formKind !== "material" && (
            <Form.Item label="Hiển thị trên Mini App" name="active" valuePropName="checked">
              <Switch />
            </Form.Item>
          )}
          <FormFooter>
            <Button onClick={() => setModal({ open: false })}>Huỷ</Button>
            <Button type="primary" htmlType="submit" loading={saving}>
              Lưu
            </Button>
          </FormFooter>
        </Form>
      </Modal>

      <StockReceiptModal store={store} open={receipt.open} initialProductId={receipt.productId} onClose={() => setReceipt({ open: false })} onSaved={applyStock} />
      <StockReceiptsDrawer store={store} open={history} onClose={() => setHistory(false)} onChanged={applyStock} />
    </div>
  );
}
