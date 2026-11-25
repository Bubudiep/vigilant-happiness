import { App as AntApp, Button, DatePicker, Drawer, Form, Input, InputNumber, Modal, Popconfirm, Select, Switch, Table, Tag } from "antd";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { LuPlus, LuTrash2 } from "react-icons/lu";
import { ApiError } from "../data/platform-api";
import {
  cancelStockReceipt,
  createStockReceipt,
  fetchStockReceipts,
  isService,
  type OptionGroup,
  type StockReceipt,
  type StoreConfig,
  type StoreProductItem,
} from "../data/store-api";
import { FORM_PROPS, FormFooter, FormGrid } from "./ui";

const money = (n: number) => `${Math.round(n).toLocaleString("vi-VN")}đ`;
const errMsg = (e: unknown, fb = "Thao tác thất bại") => (e instanceof ApiError ? e.message : fb);
const moneyInput = {
  formatter: (v: number | string | undefined) => (v === undefined || v === "" ? "" : Number(v).toLocaleString("vi-VN")),
  parser: (v: string | undefined) => Number((v ?? "").replace(/[^\d-]/g, "")) as never,
};
type StockAfter = { id: string; stock: number; costPrice: number }[];

/** Mặt hàng nhập kho được: hàng hoá / nguyên liệu không có định mức BOM */
export const stockable = (p: StoreProductItem) => !isService(p) && !(p.bom?.length);
/** Dùng làm nguyên liệu được: không phải dịch vụ, không có BOM riêng */
export const ingredientOptions = (products: StoreProductItem[], selfId?: string) =>
  products
    .filter((p) => p.id !== selfId && stockable(p))
    .sort((a, b) => Number(b.kind === "material") - Number(a.kind === "material") || a.name.localeCompare(b.name, "vi"))
    .map((p) => ({ value: p.id, label: `${p.name}${p.unit ? ` (${p.unit})` : ""}${p.kind === "material" ? " · nguyên liệu" : ""}` }));

// ───────────────────────── Nhập kho ─────────────────────────

type ReceiptForm = { supplier?: string; note?: string; receivedAt?: dayjs.Dayjs; items: { productId?: string; quantity?: number; unitCost?: number }[] };

/** Phiếu nhập kho: nhiều dòng (sản phẩm, SL, giá nhập) → cộng tồn & tính lại giá vốn bình quân */
export function StockReceiptModal({
  store,
  open,
  initialProductId,
  onClose,
  onSaved,
}: {
  store: StoreConfig;
  open: boolean;
  initialProductId?: string;
  onClose: () => void;
  onSaved: (after: StockAfter) => void;
}) {
  const { message } = AntApp.useApp();
  const [form] = Form.useForm<ReceiptForm>();
  const [saving, setSaving] = useState(false);
  const items = (Form.useWatch("items", form) ?? []) as ReceiptForm["items"];
  const products = store.products.filter(stockable);
  const byId = new Map(store.products.map((p) => [p.id, p]));
  const total = items.reduce((s, i) => s + (i?.quantity ?? 0) * (i?.unitCost ?? 0), 0);

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    const p = initialProductId ? byId.get(initialProductId) : undefined;
    form.setFieldsValue({ receivedAt: dayjs(), items: [{ productId: p?.id, quantity: undefined, unitCost: p?.costPrice || undefined }] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialProductId]);

  const save = async (v: ReceiptForm) => {
    const lines = (v.items ?? []).filter((i) => i?.productId && i.quantity);
    if (!lines.length) return message.warning("Thêm ít nhất 1 dòng có sản phẩm và số lượng");
    setSaving(true);
    try {
      const r = await createStockReceipt(store.id, {
        supplier: v.supplier,
        note: v.note,
        receivedAt: v.receivedAt?.toISOString(),
        items: lines.map((i) => ({ productId: i.productId!, quantity: i.quantity!, unitCost: i.unitCost ?? 0 })),
      });
      onSaved(r.products);
      message.success(`Đã nhập kho ${r.receipt.code} · ${money(r.receipt.total)}`);
      onClose();
    } catch (e) {
      message.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} title="Nhập kho" onCancel={onClose} footer={null} width={760} destroyOnHidden>
      <Form form={form} {...FORM_PROPS} onFinish={save}>
        <FormGrid cols={3}>
          <Form.Item label="Nhà cung cấp" name="supplier">
            <Input placeholder="VD: Đại lý cà phê Trung Nguyên" />
          </Form.Item>
          <Form.Item label="Ngày nhập" name="receivedAt">
            <DatePicker className="!w-full" format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item label="Ghi chú" name="note">
            <Input />
          </Form.Item>
        </FormGrid>
        <Form.List name="items">
          {(fields, { add, remove }) => (
            <div className="space-y-2">
              <div className="grid grid-cols-[minmax(0,1fr)_110px_140px_110px_32px] gap-2 text-xs font-medium text-slate-500">
                <span>Sản phẩm / nguyên liệu</span>
                <span>Số lượng</span>
                <span>Giá nhập / đơn vị</span>
                <span className="text-right">Thành tiền</span>
                <span />
              </div>
              {fields.map((f) => {
                const row = items[f.name] ?? {};
                const p = row.productId ? byId.get(row.productId) : undefined;
                return (
                  <div key={f.key} className="grid grid-cols-[minmax(0,1fr)_110px_140px_110px_32px] items-start gap-2">
                    <Form.Item name={[f.name, "productId"]} className="!mb-0">
                      <Select
                        showSearch
                        optionFilterProp="label"
                        placeholder="Chọn mặt hàng"
                        options={products.map((x) => ({ value: x.id, label: `${x.name}${x.unit ? ` (${x.unit})` : ""} · tồn ${x.stock ?? 0}` }))}
                        onChange={(id) => {
                          const x = byId.get(id);
                          if (x?.costPrice && !row.unitCost) form.setFieldValue(["items", f.name, "unitCost"], x.costPrice);
                        }}
                      />
                    </Form.Item>
                    <Form.Item name={[f.name, "quantity"]} className="!mb-0">
                      <InputNumber className="!w-full" min={1} precision={0} placeholder={p?.unit || "SL"} />
                    </Form.Item>
                    <Form.Item name={[f.name, "unitCost"]} className="!mb-0">
                      <InputNumber className="!w-full" min={0} {...moneyInput} placeholder={p?.costPrice ? `Hiện ${p.costPrice.toLocaleString("vi-VN")}` : "0"} />
                    </Form.Item>
                    <div className="pt-1.5 text-right text-xs font-semibold tabular-nums text-slate-800">{money((row.quantity ?? 0) * (row.unitCost ?? 0))}</div>
                    <Button type="text" danger icon={<LuTrash2 size={14} />} disabled={fields.length === 1} onClick={() => remove(f.name)} />
                  </div>
                );
              })}
              <Button type="dashed" block icon={<LuPlus size={14} />} onClick={() => add({})}>
                Thêm dòng
              </Button>
            </div>
          )}
        </Form.List>
        <div className="mt-3 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <span>Giá vốn tính lại theo bình quân gia quyền: (tồn cũ × giá vốn cũ + SL nhập × giá nhập) ÷ tổng SL.</span>
          <span className="shrink-0 pl-3 text-sm font-bold tabular-nums text-slate-900">{money(total)}</span>
        </div>
        <FormFooter>
          <Button onClick={onClose}>Huỷ</Button>
          <Button type="primary" htmlType="submit" loading={saving}>
            Nhập kho
          </Button>
        </FormFooter>
      </Form>
    </Modal>
  );
}

/** Lịch sử phiếu nhập + huỷ phiếu */
export function StockReceiptsDrawer({ store, open, onClose, onChanged }: { store: StoreConfig; open: boolean; onClose: () => void; onChanged: (after: StockAfter) => void }) {
  const { message } = AntApp.useApp();
  const [list, setList] = useState<StockReceipt[] | null>(null);
  useEffect(() => {
    if (!open) return;
    setList(null);
    fetchStockReceipts(store.id)
      .then(setList)
      .catch((e) => message.error(errMsg(e)));
  }, [open, store.id, message]);

  const cancel = async (r: StockReceipt) => {
    try {
      const x = await cancelStockReceipt(store.id, r.id);
      setList((l) => (l ?? []).map((y) => (y.id === r.id ? x.receipt : y)));
      onChanged(x.products);
      message.success(`Đã huỷ ${r.code} — đã trừ lại tồn kho`);
    } catch (e) {
      message.error(errMsg(e));
    }
  };

  return (
    <Drawer open={open} onClose={onClose} size={720} title="Lịch sử nhập kho">
      <Table<StockReceipt>
        rowKey="id"
        size="small"
        loading={!list}
        dataSource={list ?? []}
        pagination={{ pageSize: 15, hideOnSinglePage: true, showSizeChanger: false }}
        expandable={{
          expandedRowRender: (r) => (
            <div className="space-y-0.5 text-xs">
              {r.items.map((i, k) => (
                <div key={k} className="flex justify-between gap-3">
                  <span className="truncate">{i.name}</span>
                  <span className="shrink-0 tabular-nums text-slate-500">
                    {i.quantity.toLocaleString("vi-VN")} × {money(i.unitCost)} = <b className="text-slate-800">{money(i.quantity * i.unitCost)}</b>
                  </span>
                </div>
              ))}
              {r.note && <div className="pt-1 text-slate-500">Ghi chú: {r.note}</div>}
            </div>
          ),
        }}
        columns={[
          { title: "Mã", dataIndex: "code", width: 90, render: (v: string, r) => <span className={r.status === "cancelled" ? "text-slate-400 line-through" : "font-semibold"}>{v}</span> },
          { title: "Ngày", width: 100, render: (_, r) => dayjs(r.receivedAt).format("DD/MM/YYYY") },
          { title: "Nhà cung cấp", render: (_, r) => r.supplier || <span className="text-slate-400">—</span> },
          { title: "Dòng", width: 56, align: "right", render: (_, r) => r.items.length },
          { title: "Tổng", width: 120, align: "right", render: (_, r) => <span className="tabular-nums">{money(r.total)}</span> },
          {
            title: "",
            width: 90,
            align: "right",
            render: (_, r) =>
              r.status === "cancelled" ? (
                <Tag className="!m-0">Đã huỷ</Tag>
              ) : (
                <Popconfirm title={`Huỷ phiếu ${r.code}?`} description="Trừ lại số lượng đã nhập (giá vốn giữ nguyên)." okText="Huỷ phiếu" okButtonProps={{ danger: true }} cancelText="Không" onConfirm={() => cancel(r)}>
                  <Button size="small" danger>
                    Huỷ
                  </Button>
                </Popconfirm>
              ),
          },
        ]}
      />
    </Drawer>
  );
}

// ───────────────────────── BOM & tuỳ chọn trong form sản phẩm ─────────────────────────

/** Định mức nguyên liệu (Form.List "bom") + giá vốn tính được */
export function BomEditor({ store, selfId }: { store: StoreConfig; selfId?: string }) {
  const form = Form.useFormInstance();
  const bom = (Form.useWatch("bom", form) ?? []) as { productId?: string; quantity?: number }[];
  const byId = new Map(store.products.map((p) => [p.id, p]));
  const cost = bom.reduce((s, l) => s + (l?.productId ? (byId.get(l.productId)?.costPrice ?? 0) * (l.quantity ?? 0) : 0), 0);
  const opts = ingredientOptions(store.products, selfId);
  return (
    <Form.List name="bom">
      {(fields, { add, remove }) => (
        <div className="space-y-2">
          {fields.map((f) => {
            const p = bom[f.name]?.productId ? byId.get(bom[f.name]!.productId!) : undefined;
            return (
              <div key={f.key} className="grid grid-cols-[minmax(0,1fr)_120px_32px] gap-2">
                <Form.Item name={[f.name, "productId"]} className="!mb-0" rules={[{ required: true, message: "Chọn nguyên liệu" }]}>
                  <Select showSearch optionFilterProp="label" placeholder="Nguyên liệu" options={opts} />
                </Form.Item>
                <Form.Item name={[f.name, "quantity"]} className="!mb-0" rules={[{ required: true, message: "SL" }]}>
                  <InputNumber className="!w-full" min={1} precision={0} addonAfter={p?.unit || undefined} placeholder="SL" />
                </Form.Item>
                <Button type="text" danger icon={<LuTrash2 size={14} />} onClick={() => remove(f.name)} />
              </div>
            );
          })}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button size="small" type="dashed" icon={<LuPlus size={13} />} onClick={() => add({})} disabled={!opts.length}>
              Thêm nguyên liệu
            </Button>
            {fields.length > 0 && (
              <span className="text-xs text-slate-600">
                Giá vốn theo định mức: <b className="tabular-nums">{money(cost)}</b>
              </span>
            )}
          </div>
          {!opts.length && <div className="text-xs text-slate-400">Chưa có nguyên liệu — thêm mặt hàng loại “Nguyên liệu” (VD: Cà phê hạt (g), Sữa đặc (ml), Ly nhựa (cái)).</div>}
        </div>
      )}
    </Form.List>
  );
}

/** Phân loại (size…) & bán kèm (topping…): Form.List "options" */
export function OptionsEditor() {
  return (
    <Form.List name="options">
      {(groups, { add, remove }) => (
        <div className="space-y-3">
          {groups.map((g) => (
            <div key={g.key} className="rounded-lg border border-slate-200 p-2.5">
              <div className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto_32px] items-center gap-2">
                <Form.Item name={[g.name, "name"]} className="!mb-0" rules={[{ required: true, whitespace: true, message: "Tên nhóm" }]}>
                  <Input placeholder="Tên nhóm: Size, Topping, Đường, Đá…" />
                </Form.Item>
                <Form.Item name={[g.name, "multiple"]} valuePropName="checked" className="!mb-0">
                  <Switch size="small" checkedChildren="Chọn nhiều" unCheckedChildren="Chọn 1" />
                </Form.Item>
                <Form.Item name={[g.name, "required"]} valuePropName="checked" className="!mb-0">
                  <Switch size="small" checkedChildren="Bắt buộc" unCheckedChildren="Tuỳ chọn" />
                </Form.Item>
                <Form.Item name={[g.name, "max"]} className="!mb-0">
                  <InputNumber size="small" min={1} max={50} placeholder="Tối đa" className="!w-20" />
                </Form.Item>
                <Button type="text" danger icon={<LuTrash2 size={14} />} onClick={() => remove(g.name)} />
              </div>
              <Form.List name={[g.name, "choices"]}>
                {(choices, c) => (
                  <div className="mt-2 space-y-1.5 pl-3">
                    {choices.map((ch) => (
                      <div key={ch.key} className="grid grid-cols-[minmax(0,1fr)_150px_32px] gap-2">
                        <Form.Item name={[ch.name, "name"]} className="!mb-0" rules={[{ required: true, whitespace: true, message: "Tên" }]}>
                          <Input size="small" placeholder="VD: Size L, Trân châu đen" />
                        </Form.Item>
                        <Form.Item name={[ch.name, "price"]} className="!mb-0">
                          <InputNumber size="small" className="!w-full" {...moneyInput} placeholder="+ giá (đ)" />
                        </Form.Item>
                        <Button size="small" type="text" danger icon={<LuTrash2 size={13} />} onClick={() => c.remove(ch.name)} />
                      </div>
                    ))}
                    <Button size="small" type="link" className="!px-0" icon={<LuPlus size={13} />} onClick={() => c.add({ price: 0 })}>
                      Thêm lựa chọn
                    </Button>
                  </div>
                )}
              </Form.List>
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            <Button size="small" type="dashed" icon={<LuPlus size={13} />} onClick={() => add({ name: "Size", multiple: false, required: true, choices: [{ name: "M", price: 0 }, { name: "L", price: 6000 }] })}>
              Thêm phân loại (Size…)
            </Button>
            <Button size="small" type="dashed" icon={<LuPlus size={13} />} onClick={() => add({ name: "Topping", multiple: true, required: false, max: 3, choices: [{ name: "Trân châu", price: 5000 }] })}>
              Thêm bán kèm (Topping…)
            </Button>
          </div>
        </div>
      )}
    </Form.List>
  );
}

/** Chọn tuỳ chọn khi thêm món (bán tại bàn) */
export function OptionPickerModal({
  product,
  onClose,
  onPick,
}: {
  product: StoreProductItem | null;
  onClose: () => void;
  onPick: (selections: { groupId: string; choiceIds: string[] }[], label: string, price: number) => void;
}) {
  const groups: OptionGroup[] = product?.options ?? [];
  const [sel, setSel] = useState<Record<string, string[]>>({});
  useEffect(() => {
    if (!product) return;
    setSel(Object.fromEntries((product.options ?? []).map((g) => [g.id, g.required && !g.multiple ? [g.choices[0]?.id] : []])));
  }, [product]);
  if (!product) return null;
  const base = product.salePrice ?? product.price;
  const picked = groups.flatMap((g) => g.choices.filter((c) => (sel[g.id] ?? []).includes(c.id)));
  const price = base + picked.reduce((s, c) => s + c.price, 0);
  const missing = groups.find((g) => g.required && !(sel[g.id] ?? []).length);
  const toggle = (g: OptionGroup, id: string) =>
    setSel((s) => {
      const cur = s[g.id] ?? [];
      if (!g.multiple) return { ...s, [g.id]: [id] };
      if (cur.includes(id)) return { ...s, [g.id]: cur.filter((x) => x !== id) };
      if (g.max && cur.length >= g.max) return s;
      return { ...s, [g.id]: [...cur, id] };
    });
  return (
    <Modal
      open
      title={product.name}
      onCancel={onClose}
      okText={`Thêm · ${money(price)}`}
      okButtonProps={{ disabled: !!missing }}
      cancelText="Huỷ"
      onOk={() =>
        onPick(
          groups.map((g) => ({ groupId: g.id, choiceIds: sel[g.id] ?? [] })),
          picked.length ? `${product.name} (${picked.map((c) => c.name).join(", ")})` : product.name,
          price,
        )
      }
      width={440}
    >
      <div className="space-y-3">
        {groups.map((g) => (
          <div key={g.id}>
            <div className="mb-1.5 text-xs font-semibold text-slate-700">
              {g.name}
              <span className="ml-1 font-normal text-slate-400">
                {g.multiple ? `chọn nhiều${g.max ? `, tối đa ${g.max}` : ""}` : "chọn 1"}
                {g.required ? " · bắt buộc" : ""}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {g.choices.map((c) => {
                const on = (sel[g.id] ?? []).includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggle(g, c.id)}
                    className={`rounded-lg px-2.5 py-1.5 text-xs ring-1 transition ${on ? "bg-brand-600 text-white ring-brand-600" : "bg-white text-slate-700 ring-slate-200 hover:ring-brand-300"}`}
                  >
                    {c.name}
                    {c.price ? <span className={on ? "text-white/80" : "text-slate-400"}> {c.price > 0 ? "+" : ""}{money(c.price)}</span> : null}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
