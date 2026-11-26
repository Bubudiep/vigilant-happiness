import { App as AntApp, Button, Form, Input, InputNumber, Modal, Segmented, Select, Switch } from "antd";
import { useEffect } from "react";
import { LuPlus, LuTrash2 } from "react-icons/lu";
import { ApiError } from "../data/platform-api";
import { addStoreProduct, type ComboConfig, isMaterial, type StoreConfig, type StoreProductItem, updateStoreProduct } from "../data/store-api";
import { FORM_PROPS, FormFooter, FormGrid } from "./ui";

const money = (n: number) => `${Math.round(n).toLocaleString("vi-VN")}đ`;
const priceOf = (p: StoreProductItem) => p.salePrice ?? p.price;
/** Lựa chọn trong form: groupId → id lựa chọn (chọn 1) hoặc danh sách (chọn nhiều) */
type OptPick = Record<string, string | string[] | undefined>;
const pickIds = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : []);
/** Giá cộng thêm của các lựa chọn đã chọn */
const extraOf = (p: StoreProductItem, pick?: OptPick) =>
  (p.options ?? []).reduce((s, g) => s + g.choices.filter((c) => pickIds(pick?.[g.id]).includes(c.id)).reduce((x, c) => x + c.price, 0), 0);
/** Mặc định: nhóm bắt buộc chọn 1 → lựa chọn đầu tiên */
const defaultPick = (p?: StoreProductItem): OptPick =>
  Object.fromEntries((p?.options ?? []).filter((g) => g.required && !g.multiple && g.choices[0]).map((g) => [g.id, g.choices[0].id]));

/** Giá combo — giống máy chủ (backend/src/stores/combo.ts): % làm tròn 1.000đ */
export function comboPrice(base: number, discountType: ComboConfig["discountType"], discountValue: number) {
  if (discountType === "percent") return Math.max(0, Math.round((base * (100 - Math.min(100, discountValue))) / 100 / 1000) * 1000);
  return Math.max(0, base - Math.round(discountValue));
}

/** Mô tả ngắn các món trong combo: "Cà phê sữa đá (L) ×1, Bánh croissant ×1" */
export const comboSummary = (c: ComboConfig, products: StoreProductItem[]) =>
  c.items
    .map((l) => {
      const p = products.find((x) => x.id === l.productId);
      const opts = (l.selections ?? []).flatMap((s) => {
        const g = p?.options?.find((x) => x.id === s.groupId);
        return s.choiceIds.map((id) => g?.choices.find((ch) => ch.id === id)?.name).filter(Boolean);
      });
      return `${p?.name ?? "?"}${opts.length ? ` (${opts.join(", ")})` : ""} ×${l.quantity}`;
    })
    .join(", ");

type ComboForm = {
  name: string;
  category: string;
  imageUrl?: string;
  description?: string;
  active: boolean;
  items: { productId?: string; quantity?: number; pick?: OptPick }[];
  discountType: ComboConfig["discountType"];
  discountValue?: number;
};

/**
 * ComboModal — thêm / sửa combo: chọn các món đang bán + số lượng, chọn giảm giá (số tiền hoặc %).
 * Giá combo = tổng giá món − giảm (máy chủ tính lại khi lưu). Bán combo trừ kho từng món bên trong.
 */
export function ComboModal({
  open,
  store,
  item,
  onClose,
  onSaved,
}: {
  open: boolean;
  store: StoreConfig;
  item?: StoreProductItem;
  onClose: () => void;
  onSaved: (saved: StoreProductItem, created: boolean) => void;
}) {
  const { message } = AntApp.useApp();
  const [form] = Form.useForm<ComboForm>();
  const items = (Form.useWatch("items", form) ?? []) as ComboForm["items"];
  const discountType = (Form.useWatch("discountType", form) ?? "amount") as ComboForm["discountType"];
  const discountValue = Number(Form.useWatch("discountValue", form) ?? 0);

  // Món chọn được: đang có trong cửa hàng, không phải nguyên liệu / combo khác / chính combo này
  const choosable = store.products.filter((p) => !isMaterial(p) && !p.combo && p.id !== item?.id);
  const byId = new Map(store.products.map((p) => [p.id, p]));
  const lineTotal = (l?: ComboForm["items"][number]) => {
    const p = l?.productId ? byId.get(l.productId) : undefined;
    return p ? (priceOf(p) + extraOf(p, l?.pick)) * (l?.quantity ?? 1) : 0;
  };
  const base = items.reduce((s, l) => s + lineTotal(l), 0);
  const final = comboPrice(base, discountType, discountValue);

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    form.setFieldsValue(
      item?.combo
        ? {
            name: item.name,
            category: item.category,
            imageUrl: item.imageUrl,
            description: item.description,
            active: item.active,
            items: item.combo.items.map((l) => {
              const p = byId.get(l.productId);
              const pick: OptPick = {};
              for (const sel of l.selections ?? []) pick[sel.groupId] = p?.options?.find((g) => g.id === sel.groupId)?.multiple ? sel.choiceIds : sel.choiceIds[0];
              return { productId: l.productId, quantity: l.quantity, pick };
            }),
            discountType: item.combo.discountType,
            discountValue: item.combo.discountValue,
          }
        : { name: "", category: "Combo", active: true, items: [{ quantity: 1 }, { quantity: 1 }], discountType: "amount", discountValue: 0 },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item, form]);

  const save = async (v: ComboForm) => {
    const lines = (v.items ?? [])
      .filter((l) => l?.productId)
      .map((l) => {
        const selections = Object.entries(l.pick ?? {})
          .map(([groupId, val]) => ({ groupId, choiceIds: pickIds(val) }))
          .filter((x) => x.choiceIds.length);
        return { productId: l.productId!, quantity: l.quantity ?? 1, ...(selections.length ? { selections } : {}) };
      });
    if (lines.length < 2) return message.warning("Combo cần ít nhất 2 món");
    const data = {
      name: v.name.trim(),
      category: v.category?.trim() || "Combo",
      imageUrl: v.imageUrl?.trim() || undefined,
      description: v.description?.trim() || undefined,
      active: v.active,
      kind: "product" as const,
      combo: { items: lines, discountType: v.discountType, discountValue: v.discountValue ?? 0 },
      // Máy chủ tính lại giá; gửi kèm để hiện ngay
      price: base,
      salePrice: final < base ? final : null,
    };
    try {
      const saved = item ? await updateStoreProduct(store.id, item.id, data) : await addStoreProduct(store.id, data as Omit<StoreProductItem, "id">);
      message.success(item ? "Đã cập nhật combo" : "Đã thêm combo");
      onSaved(saved, !item);
    } catch (e) {
      message.error(e instanceof ApiError ? e.message : "Không lưu được combo");
    }
  };

  return (
    <Modal title={item ? "Sửa combo" : "Thêm combo"} open={open} onCancel={onClose} footer={null} width={640} destroyOnHidden>
      <Form form={form} {...FORM_PROPS} onFinish={save}>
        <div data-ui="ComboModal">
          <FormGrid>
            <Form.Item label="Tên combo" name="name" rules={[{ required: true, whitespace: true, message: "Nhập tên combo" }]}>
              <Input placeholder="VD: Combo sáng (cà phê + bánh)" />
            </Form.Item>
            <Form.Item label="Danh mục" name="category">
              <Input placeholder="Combo" />
            </Form.Item>
          </FormGrid>

          <div className="mb-1.5 text-xs font-semibold text-slate-700">Món trong combo</div>
          <Form.List name="items">
            {(fields, { add, remove }) => (
              <div className="mb-3 space-y-2">
                {fields.map((f) => {
                  const p = items[f.name]?.productId ? byId.get(items[f.name]!.productId!) : undefined;
                  return (
                    <div key={f.key} data-ui="ComboItem" className="rounded-lg border border-slate-100 bg-slate-50/50 p-2">
                    <div className="grid grid-cols-[minmax(0,1fr)_88px_96px_28px] items-center gap-2">
                      <Form.Item name={[f.name, "productId"]} className="!mb-0" rules={[{ required: true, message: "Chọn món" }]}>
                        <Select
                          onChange={(id: string) => form.setFieldValue(["items", f.name, "pick"], defaultPick(byId.get(id)))}
                          showSearch
                          optionFilterProp="label"
                          placeholder="Chọn sản phẩm / dịch vụ"
                          options={choosable.map((x) => ({
                            value: x.id,
                            label: `${x.name} · ${money(priceOf(x))}`,
                            disabled: items.some((l, i) => i !== f.name && l?.productId === x.id),
                          }))}
                        />
                      </Form.Item>
                      <Form.Item name={[f.name, "quantity"]} className="!mb-0" initialValue={1}>
                        <InputNumber className="!w-full" min={1} max={99} precision={0} prefix="×" />
                      </Form.Item>
                      <span className="text-right text-xs tabular-nums text-slate-600">{p ? money(lineTotal(items[f.name])) : "—"}</span>
                      <Button type="text" danger icon={<LuTrash2 size={14} />} onClick={() => remove(f.name)} disabled={fields.length <= 2} />
                    </div>
                    {/* Size / topping cố định của món trong combo */}
                    {!!p?.options?.length && (
                      <div data-ui="ComboItemOptions" className="mt-1.5 flex flex-wrap gap-2">
                        {p.options.map((g) => (
                          <Form.Item
                            key={g.id}
                            name={[f.name, "pick", g.id]}
                            className="!mb-0 min-w-[140px] flex-1"
                            rules={[{ required: g.required, message: `Chọn ${g.name}` }]}
                          >
                            <Select
                              size="small"
                              allowClear={!g.required}
                              mode={g.multiple ? "multiple" : undefined}
                              maxCount={g.multiple && g.max ? g.max : undefined}
                              placeholder={`${g.name}${g.required ? "" : " (tuỳ chọn)"}`}
                              options={g.choices.map((c) => ({ value: c.id, label: `${g.name}: ${c.name}${c.price ? ` +${money(c.price)}` : ""}` }))}
                            />
                          </Form.Item>
                        ))}
                      </div>
                    )}
                    </div>
                  );
                })}
                <Button size="small" type="dashed" icon={<LuPlus size={13} />} onClick={() => add({ quantity: 1 })} disabled={fields.length >= 20}>
                  Thêm món
                </Button>
              </div>
            )}
          </Form.List>

          <div className="mb-3 grid grid-cols-[auto_160px] items-center gap-2">
            <Form.Item label="Giảm giá" name="discountType" className="!mb-0">
              <Segmented
                options={[
                  { value: "amount", label: "Số tiền (đ)" },
                  { value: "percent", label: "Phần trăm (%)" },
                ]}
              />
            </Form.Item>
            <Form.Item label=" " name="discountValue" className="!mb-0">
              <InputNumber
                className="!w-full"
                min={0}
                max={discountType === "percent" ? 100 : base || undefined}
                step={discountType === "percent" ? 5 : 1000}
                suffix={discountType === "percent" ? "%" : "đ"}
                formatter={(x) => (discountType === "percent" ? `${x ?? ""}` : x ? Number(x).toLocaleString("vi-VN") : "")}
                parser={(x) => Number((x ?? "").replace(/\D/g, "")) as never}
              />
            </Form.Item>
          </div>

          <div data-ui="ComboPriceSummary" className="mb-3 rounded-lg bg-slate-50 p-3 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Tổng giá các món</span>
              <span className="tabular-nums">{money(base)}</span>
            </div>
            <div className="flex justify-between text-emerald-700">
              <span>Giảm</span>
              <span className="tabular-nums">−{money(base - final)}</span>
            </div>
            <div className="mt-1 flex justify-between border-t border-slate-200 pt-1 text-sm font-bold">
              <span>Giá combo</span>
              <span className="tabular-nums text-brand-700">{money(final)}</span>
            </div>
            <div className="mt-1 text-2xs text-slate-400">Giá combo tính theo giá món lúc lưu — đổi giá món thì mở combo và lưu lại để cập nhật.</div>
          </div>

          <FormGrid>
            <Form.Item label="Ảnh (URL)" name="imageUrl">
              <Input placeholder="https://…" />
            </Form.Item>
            <Form.Item label="Hiện trên Mini App" name="active" valuePropName="checked">
              <Switch />
            </Form.Item>
          </FormGrid>
          <Form.Item label="Mô tả" name="description">
            <Input.TextArea rows={2} />
          </Form.Item>
          <FormFooter>
            <Button onClick={onClose}>Huỷ</Button>
            <Button type="primary" htmlType="submit">
              Lưu combo
            </Button>
          </FormFooter>
        </div>
      </Form>
    </Modal>
  );
}
