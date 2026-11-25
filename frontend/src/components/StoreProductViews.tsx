import { App as AntApp, Button, Form, Input, InputNumber, Modal, Popconfirm, Radio, Segmented, Switch, Table, Tag, Tooltip } from "antd";
import { useMemo, useRef, useState } from "react";
import { LuClock, LuPackage, LuPlus, LuSearch, LuSparkles, LuTrash2 } from "react-icons/lu";
import { ApiError } from "../data/platform-api";
import {
  addStoreProduct,
  deleteStoreProduct,
  isService,
  LOW_STOCK,
  type ProductKind,
  type StoreConfig,
  type StoreProductItem,
  updateStoreProduct,
} from "../data/store-api";
import { FilterBar, FilterSelect, FORM_PROPS, FormFooter, FormGrid, PageHeader, StatCard, StatGrid } from "./ui";


export type StockState = "service" | "out" | "low" | "ok";
export const stockState = (p: StoreProductItem): StockState =>
  isService(p) ? "service" : (p.stock ?? 0) <= 0 ? "out" : (p.stock ?? 0) <= LOW_STOCK ? "low" : "ok";

const KIND_FILTERS = [
  { value: "all", label: "Tất cả" },
  { value: "product", label: "Sản phẩm" },
  { value: "service", label: "Dịch vụ" },
];
const STOCK_FILTERS = [
  { value: "low", label: "Sắp hết hàng" },
  { value: "out", label: "Hết hàng" },
  { value: "ok", label: "Còn hàng" },
];

const money = (n: number) => `${n.toLocaleString("vi-VN")}đ`;
const fmtDuration = (m?: number | null) => (!m ? "" : m < 60 ? `${m} phút` : `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}p` : ""}`);
const errMsg = (e: unknown, fb = "Thao tác thất bại") => (e instanceof ApiError ? e.message : fb);

type FormValues = Omit<StoreProductItem, "id">;

/**
 * Sản phẩm / Dịch vụ + tồn kho (trước đây tồn kho ở trang "Kho" riêng).
 * - Sản phẩm: có tồn kho, sửa nhanh ngay trên bảng.
 * - Dịch vụ: không quản lý kho, có thời lượng (phút).
 * Lưu thẳng lên máy chủ; `onLocal` cập nhật danh sách trên giao diện.
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
  const [form] = Form.useForm<FormValues>();
  const formKind = Form.useWatch("kind", form) as ProductKind | undefined;

  const products = store.products;
  const goods = products.filter((p) => !isService(p));
  const services = products.filter(isService);
  const low = goods.filter((p) => stockState(p) === "low").length;
  const out = goods.filter((p) => stockState(p) === "out").length;
  const stockValue = goods.reduce((s, p) => s + Math.max(0, p.stock ?? 0) * (p.salePrice ?? p.price), 0);
  const categories = useMemo(() => [...new Set(products.map((p) => p.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, "vi")), [products]);

  const kw = q.trim().toLowerCase();
  const shown = products.filter(
    (p) =>
      (kind === "all" || (kind === "service") === isService(p)) &&
      (!stockFilter || stockState(p) === stockFilter) &&
      (!category || p.category === category) &&
      (!kw || p.name.toLowerCase().includes(kw) || (p.sku ?? "").toLowerCase().includes(kw)),
  );

  const replace = (saved: StoreProductItem) => onLocal((s) => ({ ...s, products: s.products.map((p) => (p.id === saved.id ? saved : p)) }));

  // ── Sửa nhanh tồn kho: cập nhật ngay trên giao diện, chờ 0,6s không gõ nữa mới lưu ──
  const stockTimers = useRef<Record<string, number>>({});
  const changeStock = (p: StoreProductItem, stock: number) => {
    onLocal((s) => ({ ...s, products: s.products.map((x) => (x.id === p.id ? { ...x, stock } : x)) }));
    window.clearTimeout(stockTimers.current[p.id]);
    stockTimers.current[p.id] = window.setTimeout(async () => {
      try {
        replace(await updateStoreProduct(store.id, p.id, { stock }));
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

  const open = (item?: StoreProductItem, asKind: ProductKind = kind === "service" ? "service" : "product") => {
    setModal({ open: true, item });
    form.resetFields();
    form.setFieldsValue(
      item
        ? { ...item, kind: item.kind ?? "product" }
        : { kind: asKind, name: "", category: categories[0] ?? "Chung", price: 0, stock: asKind === "product" ? 0 : undefined, active: true },
    );
  };

  const save = async (values: FormValues) => {
    const data: Partial<FormValues> = {
      ...values,
      // Dịch vụ không quản lý kho; sản phẩm không có thời lượng
      ...(values.kind === "service" ? { stock: 0 } : { durationMin: null }),
      salePrice: values.salePrice ?? null,
    };
    setSaving(true);
    try {
      if (modal.item) {
        replace(await updateStoreProduct(store.id, modal.item.id, data));
      } else {
        const saved = await addStoreProduct(store.id, data as FormValues);
        onLocal((s) => ({ ...s, products: [saved, ...s.products] }));
      }
      message.success(modal.item ? "Đã cập nhật" : values.kind === "service" ? "Đã thêm dịch vụ" : "Đã thêm sản phẩm");
      setModal({ open: false });
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
    } catch (e) {
      message.error(errMsg(e));
    }
  };

  return (
    <div className="space-y-4">
      <StatGrid>
        <StatCard label="Sản phẩm" icon={<LuPackage size={16} className="text-brand-600" />} value={goods.length} hint={`Giá trị tồn ${money(stockValue)}`} />
        <StatCard label="Dịch vụ" icon={<LuSparkles size={16} className="text-violet-600" />} value={services.length} hint="Không quản lý tồn kho" />
        <StatCard label="Sắp hết hàng" tone={low ? "warning" : "default"} value={low} hint={`Còn ≤ ${LOW_STOCK}`} />
        <StatCard label="Hết hàng" tone={out ? "danger" : "default"} value={out} hint={out ? "Khách không đặt được" : "Không có"} />
      </StatGrid>

      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <PageHeader title="Sản phẩm & Dịch vụ" description="Danh mục, giá bán, tồn kho và trạng thái hiển thị trên Mini App. Dịch vụ không trừ tồn kho." />
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
              <Button icon={<LuSparkles size={14} />} onClick={() => open(undefined, "service")}>
                Thêm dịch vụ
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
          scroll={{ x: 860 }}
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
                      {isService(p) ? <LuSparkles size={15} /> : <LuPackage size={15} />}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-slate-900" title={p.name}>
                      {p.name}
                    </div>
                    <div className="truncate text-xs text-slate-500">
                      {[p.category, p.sku && `SKU ${p.sku}`, p.unit].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                </div>
              ),
            },
            {
              title: "Loại",
              width: 96,
              render: (_, p) => (isService(p) ? <Tag color="purple">Dịch vụ</Tag> : <Tag color="blue">Sản phẩm</Tag>),
            },
            {
              title: "Giá bán",
              width: 120,
              align: "right",
              render: (_, p) => (
                <div className="tabular-nums">
                  <div className="font-semibold text-slate-900">{money(p.salePrice ?? p.price)}</div>
                  {p.salePrice != null && p.salePrice < p.price && <div className="text-xs text-slate-400 line-through">{money(p.price)}</div>}
                </div>
              ),
            },
            {
              title: "Tồn kho / Thời lượng",
              width: 180,
              render: (_, p) => {
                if (isService(p))
                  return (
                    <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                      <LuClock size={12} /> {fmtDuration(p.durationMin) || "Không quản lý kho"}
                    </span>
                  );
                const st = stockState(p);
                return (
                  <div className="flex items-center gap-2">
                    <InputNumber
                      size="small"
                      min={0}
                      max={1_000_000}
                      precision={0}
                      className="!w-20"
                      value={p.stock ?? 0}
                      onChange={(v) => changeStock(p, Number(v ?? 0))}
                    />
                    {st === "out" ? <Tag color="red" className="!m-0">Hết</Tag> : st === "low" ? <Tag color="orange" className="!m-0">Sắp hết</Tag> : null}
                  </div>
                );
              },
            },
            {
              title: "Hiển thị",
              width: 76,
              render: (_, p) => <Switch size="small" checked={p.active} onChange={(active) => patch(p, { active })} />,
            },
            {
              title: "",
              width: 96,
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
        title={modal.item ? `Sửa ${isService(modal.item) ? "dịch vụ" : "sản phẩm"}` : formKind === "service" ? "Thêm dịch vụ" : "Thêm sản phẩm"}
        open={modal.open}
        onCancel={() => setModal({ open: false })}
        footer={null}
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
              ]}
            />
          </Form.Item>
          <Form.Item label={formKind === "service" ? "Tên dịch vụ" : "Tên sản phẩm"} name="name" rules={[{ required: true, message: "Nhập tên" }]}>
            <Input placeholder={formKind === "service" ? "VD: Siêu âm 5D, Gội đầu dưỡng sinh…" : "VD: Cà phê sữa đá, Áo thun…"} />
          </Form.Item>
          <FormGrid>
            <Form.Item label="Danh mục" name="category">
              <Input placeholder="Cà phê, Gói khám…" />
            </Form.Item>
            <Form.Item label={formKind === "service" ? "Đơn vị" : "Đơn vị / Size"} name="unit">
              <Input placeholder={formKind === "service" ? "Lượt, Buổi, Gói…" : "Hộp 500g, Size M…"} />
            </Form.Item>
            <Form.Item label="Giá gốc (đ)" name="price" rules={[{ required: true, message: "Nhập giá" }]}>
              <InputNumber className="!w-full" min={0} step={1000} />
            </Form.Item>
            <Form.Item label="Giá khuyến mãi (đ)" name="salePrice">
              <InputNumber className="!w-full" min={0} step={1000} />
            </Form.Item>
            {formKind === "service" ? (
              <Form.Item label="Thời lượng (phút)" name="durationMin">
                <InputNumber className="!w-full" min={0} step={15} placeholder="VD: 45" />
              </Form.Item>
            ) : (
              <>
                <Form.Item label="Tồn kho" name="stock">
                  <InputNumber className="!w-full" min={0} precision={0} />
                </Form.Item>
                <Form.Item label="Mã SKU" name="sku">
                  <Input />
                </Form.Item>
              </>
            )}
            <Form.Item label="Nhãn" name="tag">
              <Input placeholder="Bán chạy, Mới…" />
            </Form.Item>
          </FormGrid>
          <Form.Item label="Hiển thị trên Mini App" name="active" valuePropName="checked">
            <Switch />
          </Form.Item>
          <FormFooter>
            <Button onClick={() => setModal({ open: false })}>Huỷ</Button>
            <Button type="primary" htmlType="submit" loading={saving}>
              Lưu
            </Button>
          </FormFooter>
        </Form>
      </Modal>
    </div>
  );
}
