import { App as AntApp, Button, Form, Input, InputNumber, Popconfirm, Segmented, Select, Switch, Table, Tooltip } from "antd";
import { useMemo, useState } from "react";
import { LuCoffee, LuGift, LuMinus, LuPlus } from "react-icons/lu";
import { ApiError } from "../data/platform-api";
import { adjustCustomerStamps, saveStampProgram, type StampProgram, type StoreConfig, type StoreCustomerItem } from "../data/store-api";
import { STAMP_ICON } from "../miniapp-builder/icons";
import { StampIconPicker } from "../miniapp-builder/StampIconPicker";
import { FORM_PROPS, FormGrid } from "./ui";

const DEFAULT: StampProgram = { enabled: true, required: 10, productIds: [], countBy: "item", reward: "Tặng 1 ly bất kỳ", icon: "coffee" };
const errMsg = (e: unknown, fb = "Thao tác thất bại") => (e instanceof ApiError ? e.message : fb);

/** Lưới tem (xem trước / hiển thị cho từng khách) */
export function StampGrid({ program, filled, color = "#1657f3", size = 26 }: { program: Pick<StampProgram, "required" | "icon">; filled: number; color?: string; size?: number }) {
  const Ico = STAMP_ICON[program.icon] ?? LuCoffee;
  const cols = program.required <= 6 ? program.required : program.required <= 12 ? Math.ceil(program.required / 2) : 8;
  return (
    <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${cols}, ${size}px)` }}>
      {Array.from({ length: program.required }, (_, i) => (
        <span
          key={i}
          className="flex items-center justify-center rounded-full"
          style={{ width: size, height: size, ...(i < filled ? { background: color, color: "#fff" } : { background: "#f1f5f9", color: "#cbd5e1" }) }}
        >
          {i === program.required - 1 ? <LuGift size={size * 0.5} /> : <Ico size={size * 0.5} />}
        </span>
      ))}
    </div>
  );
}

/**
 * Thẻ tích tem: số tem cần để đổi quà, sản phẩm / dịch vụ được tính tem, cách tính (mỗi món / mỗi đơn), phần quà.
 * Tem tự cộng khi đơn của khách chuyển "Hoàn thành" (trừ lại nếu đơn bị mở lại / huỷ).
 */
export function StampProgramPanel({ store, applyLocal }: { store: StoreConfig; applyLocal: (updater: (s: StoreConfig) => StoreConfig) => void }) {
  const { message } = AntApp.useApp();
  const [form] = Form.useForm<StampProgram>();
  const [saving, setSaving] = useState(false);
  const preview = (Form.useWatch([], form) as StampProgram | undefined) ?? store.stampProgram ?? DEFAULT;
  const color = store.theme?.primary || "#1657f3";
  const [q, setQ] = useState("");

  const save = async (v: StampProgram) => {
    setSaving(true);
    try {
      const saved = await saveStampProgram(store.id, { ...DEFAULT, ...v, productIds: v.productIds ?? [] });
      applyLocal((s) => ({ ...s, stampProgram: saved }));
      message.success(saved.enabled ? "Đã lưu thẻ tích tem" : "Đã tắt thẻ tích tem");
    } catch (e) {
      message.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  const required = Math.max(2, Number(preview.required) || 10);
  const withStamps = useMemo(
    () => store.customers.filter((c) => (c.stamps ?? 0) > 0 || (c.stampRewards ?? 0) > 0).sort((a, b) => (b.stamps ?? 0) - (a.stamps ?? 0)),
    [store.customers],
  );
  const kw = q.trim().toLowerCase();

  const adjust = async (c: StoreCustomerItem, body: { action: "redeem" } | { action: "adjust"; delta: number }) => {
    try {
      const r = await adjustCustomerStamps(store.id, c.id, body);
      applyLocal((s) => ({ ...s, customers: s.customers.map((x) => (x.id === c.id ? { ...x, stamps: r.stamps, stampRewards: r.stampRewards } : x)) }));
      if (body.action === "redeem") message.success(`Đã đổi quà cho ${c.name}`);
    } catch (e) {
      message.error(errMsg(e));
    }
  };

  return (
    <div className="space-y-5 pt-1">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Form form={form} {...FORM_PROPS} initialValues={store.stampProgram ?? { ...DEFAULT, enabled: false }} onFinish={save}>
          <Form.Item label="Bật thẻ tích tem" name="enabled" valuePropName="checked">
            <Switch />
          </Form.Item>
          <FormGrid>
            <Form.Item label="Số tem để đổi 1 quà" name="required" rules={[{ required: true, message: "Nhập số tem" }]} extra="Từ 2 đến 50 tem">
              <InputNumber className="!w-full" min={2} max={50} />
            </Form.Item>
            <Form.Item label="Phần quà khi đủ tem" name="reward" rules={[{ required: true, whitespace: true, message: "Nhập phần quà" }]}>
              <Input placeholder="VD: Tặng 1 ly bất kỳ, Giảm 50% lần sau" maxLength={120} />
            </Form.Item>
            <Form.Item label="Cách tính tem" name="countBy">
              <Segmented
                block
                options={[
                  { value: "item", label: "Mỗi món 1 tem" },
                  { value: "order", label: "Mỗi đơn 1 tem" },
                ]}
              />
            </Form.Item>
          </FormGrid>
          <Form.Item label="Biểu tượng tem" name="icon">
            <StampIconPicker />
          </Form.Item>
          <Form.Item
            label="Sản phẩm / dịch vụ được tính tem"
            name="productIds"
            extra="Để trống = mọi sản phẩm & dịch vụ. Tiền giờ bàn / phòng không tính tem."
          >
            <Select
              mode="multiple"
              allowClear
              optionFilterProp="label"
              placeholder="Mọi sản phẩm & dịch vụ"
              maxTagCount="responsive"
              options={store.products.map((p) => ({ value: p.id, label: `${p.name}${p.category ? ` · ${p.category}` : ""}` }))}
            />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={saving}>
            Lưu thẻ tích tem
          </Button>
        </Form>

        {/* Xem trước như trên Mini App */}
        <div className="h-fit rounded-2xl border border-dashed p-4" style={{ borderColor: `${color}66` }}>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Xem trước</div>
          <div className="text-sm font-bold text-slate-900">Thẻ tích tem</div>
          <div className="mb-3 text-xs text-slate-500">
            Tích đủ {required} tem — {preview.reward || "nhận quà"}
            {preview.productIds?.length ? ` · áp dụng ${preview.productIds.length} món` : ""}
          </div>
          <StampGrid program={{ required, icon: preview.icon ?? "coffee" }} filled={Math.min(required - 1, Math.round(required * 0.6))} color={color} />
          {!preview.enabled && <div className="mt-3 text-xs text-amber-600">Đang tắt — Mini App chưa hiện tem của khách.</div>}
        </div>
      </div>

      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-semibold text-slate-900">Tem của khách ({withStamps.length})</div>
          <Input allowClear size="small" placeholder="Tìm tên / SĐT" value={q} onChange={(e) => setQ(e.target.value)} className="!w-56" />
        </div>
        <Table<StoreCustomerItem>
          rowKey="id"
          size="small"
          dataSource={withStamps.filter((c) => !kw || c.name.toLowerCase().includes(kw) || c.phone.includes(kw))}
          pagination={{ pageSize: 10, hideOnSinglePage: true, showSizeChanger: false }}
          locale={{ emptyText: "Chưa có khách nào có tem — tem tự cộng khi đơn hoàn thành" }}
          columns={[
            { title: "Khách", render: (_, c) => <div><div className="font-semibold">{c.name}</div><div className="text-xs tabular-nums text-slate-500">{c.phone}</div></div> },
            { title: "Tem", width: 260, render: (_, c) => <StampGrid program={{ required, icon: preview.icon ?? "coffee" }} filled={Math.min(required, c.stamps ?? 0)} color={color} size={18} /> },
            { title: "Có", width: 70, align: "right", render: (_, c) => <span className="tabular-nums">{c.stamps ?? 0}/{required}</span> },
            { title: "Đã đổi", width: 70, align: "right", render: (_, c) => <span className="tabular-nums">{c.stampRewards ?? 0}</span> },
            {
              title: "",
              width: 170,
              align: "right",
              render: (_, c) => (
                <div className="flex justify-end gap-1">
                  <Tooltip title="Trừ 1 tem">
                    <Button size="small" icon={<LuMinus size={12} />} disabled={!c.stamps} onClick={() => adjust(c, { action: "adjust", delta: -1 })} />
                  </Tooltip>
                  <Tooltip title="Cộng 1 tem">
                    <Button size="small" icon={<LuPlus size={12} />} onClick={() => adjust(c, { action: "adjust", delta: 1 })} />
                  </Tooltip>
                  <Popconfirm title={`Đổi quà cho ${c.name}?`} description={`Trừ ${required} tem · ${preview.reward}`} okText="Đổi quà" cancelText="Huỷ" onConfirm={() => adjust(c, { action: "redeem" })}>
                    <Button size="small" type="primary" disabled={(c.stamps ?? 0) < required}>
                      Đổi quà
                    </Button>
                  </Popconfirm>
                </div>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}
