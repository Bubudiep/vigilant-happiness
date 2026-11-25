import { StampProgramPanel } from "./StoreStampViews";
import {
  App as AntApp,
  Button,
  ColorPicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Progress,
  Select,
  Switch,
  Table,
  Tabs,
  Tag,
} from "antd";
import dayjs from "dayjs";
import { lazy, Suspense, useState } from "react";
import { LuCrown, LuPlus, LuPrinter, LuStamp, LuTicket, LuTrash2, LuUsers } from "react-icons/lu";
import { StoreConfig, StoreMemberTierItem, StoreVoucherItem } from "../data/store-api";

// Mã thẻ / in thẻ / xuất Excel — tải khi mở (kèm thư viện QR & Excel)
const VoucherCodesDrawer = lazy(() => import("./VoucherCards").then((m) => ({ default: m.VoucherCodesDrawer })));

export const DEFAULT_MEMBER_TIERS: StoreMemberTierItem[] = [
  {
    id: "tier_member",
    code: "member",
    name: "Thành viên",
    minSpent: 0,
    minPoints: 0,
    discountPercent: 0,
    pointMultiplier: 1,
    color: "#64748b",
    benefits: "Tích điểm 1% mỗi đơn hàng · Nhận thông báo ưu đãi mới",
  },
  {
    id: "tier_silver",
    code: "silver",
    name: "Bạc",
    minSpent: 2000000,
    minPoints: 200,
    discountPercent: 3,
    pointMultiplier: 1.2,
    color: "#0ea5e9",
    benefits: "Giảm 3% mọi đơn · Tích điểm x1.2 · Quà sinh nhật 100K",
  },
  {
    id: "tier_gold",
    code: "gold",
    name: "Vàng",
    minSpent: 5000000,
    minPoints: 500,
    discountPercent: 7,
    pointMultiplier: 1.5,
    color: "#f59e0b",
    benefits: "Giảm 7% mọi đơn · Freeship toàn quốc · Ưu tiên đặt lịch",
  },
  {
    id: "tier_diamond",
    code: "diamond",
    name: "Kim Cương",
    minSpent: 15000000,
    minPoints: 1500,
    discountPercent: 12,
    pointMultiplier: 2,
    color: "#7c3aed",
    benefits: "Giảm 12% VIP · Tích điểm x2 · Voucher độc quyền hàng tháng",
  },
];

export function LoyaltySection({
  store,
  updateCurrentStore,
  applyLocal,
}: {
  store: StoreConfig;
  updateCurrentStore: (updater: (s: StoreConfig) => StoreConfig) => void;
  /** Ghi vào giao diện (dữ liệu đã lưu trên máy chủ) */
  applyLocal: (updater: (s: StoreConfig) => StoreConfig) => void;
}) {
  const [codesFor, setCodesFor] = useState<string | null>(null);
  const { message } = AntApp.useApp();
  const tiers = store.memberTiers ?? DEFAULT_MEMBER_TIERS;
  const vouchers = store.vouchers ?? [];

  const [tierModal, setTierModal] = useState<{ open: boolean; item?: StoreMemberTierItem }>({ open: false });
  const [voucherModal, setVoucherModal] = useState<{ open: boolean; item?: StoreVoucherItem }>({ open: false });
  const [tierForm] = Form.useForm();
  const [voucherForm] = Form.useForm();

  // --- CRUD Hạng thành viên ---
  const openTierModal = (item?: StoreMemberTierItem) => {
    setTierModal({ open: true, item });
    tierForm.setFieldsValue(
      item ?? {
        name: "",
        code: "",
        minSpent: 1000000,
        minPoints: 100,
        discountPercent: 5,
        pointMultiplier: 1.2,
        color: "#1657f3",
        benefits: "",
      },
    );
  };

  const saveTier = (values: Omit<StoreMemberTierItem, "id" | "color"> & { color: string | { toHexString?: () => string } }) => {
    const hexColor = typeof values.color === "string" ? values.color : values.color?.toHexString?.() || "#1657f3";
    const normalized: Omit<StoreMemberTierItem, "id"> = {
      ...values,
      code: (values.code || values.name).trim().toLowerCase().replace(/[^a-z0-9]+/g, "_"),
      color: hexColor,
    };
    updateCurrentStore((s) => {
      const list = s.memberTiers ?? DEFAULT_MEMBER_TIERS;
      if (tierModal.item) {
        return { ...s, memberTiers: list.map((t) => (t.id === tierModal.item!.id ? { ...t, ...normalized } : t)) };
      }
      return { ...s, memberTiers: [...list, { id: `tier_${Date.now()}`, ...normalized }] };
    });
    setTierModal({ open: false });
    message.success(tierModal.item ? "Đã cập nhật hạng thành viên" : "Đã thêm hạng thành viên mới");
  };

  const deleteTier = (id: string) => {
    updateCurrentStore((s) => ({
      ...s,
      memberTiers: (s.memberTiers ?? DEFAULT_MEMBER_TIERS).filter((t) => t.id !== id),
    }));
    message.success("Đã xoá hạng thành viên");
  };

  // --- CRUD Voucher ---
  const openVoucherModal = (item?: StoreVoucherItem) => {
    setVoucherModal({ open: true, item });
    voucherForm.setFieldsValue(
      item ?? {
        code: "",
        title: "",
        discountType: "percent",
        discountValue: 10,
        minOrderValue: 200000,
        maxDiscount: 100000,
        tierCode: "all",
        quantity: 100,
        usedCount: 0,
        startDate: dayjs().format("YYYY-MM-DD"),
        endDate: dayjs().add(30, "day").format("YYYY-MM-DD"),
        active: true,
      },
    );
  };

  const saveVoucher = (values: Omit<StoreVoucherItem, "id" | "usedCount">) => {
    const cleanCode = values.code.trim().toUpperCase().replace(/\s+/g, "");
    updateCurrentStore((s) => {
      const list = s.vouchers ?? [];
      if (voucherModal.item) {
        return {
          ...s,
          vouchers: list.map((v) =>
            v.id === voucherModal.item!.id ? { ...v, ...values, code: cleanCode } : v,
          ),
        };
      }
      return {
        ...s,
        vouchers: [{ id: `vc_${Date.now()}`, usedCount: 0, ...values, code: cleanCode }, ...list],
      };
    });
    setVoucherModal({ open: false });
    message.success(voucherModal.item ? "Đã cập nhật voucher" : "Đã tạo voucher mới");
  };

  const deleteVoucher = (id: string) => {
    updateCurrentStore((s) => ({
      ...s,
      vouchers: (s.vouchers ?? []).filter((v) => v.id !== id),
    }));
    message.success("Đã xoá voucher");
  };

  const toggleVoucherActive = (id: string, active: boolean) => {
    updateCurrentStore((s) => ({
      ...s,
      vouchers: (s.vouchers ?? []).map((v) => (v.id === id ? { ...v, active } : v)),
    }));
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <Tabs
        defaultActiveKey="tiers"
        items={[
          {
            key: "tiers",
            label: (
              <span className="inline-flex items-center gap-1.5 font-semibold">
                <LuCrown size={15} /> Phân hạng thành viên ({tiers.length})
              </span>
            ),
            children: (
              <div className="space-y-4 pt-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-slate-500">
                    Thiết lập ngưỡng chi tiêu, hệ số tích điểm và chiết khấu tự động cho từng hạng khách hàng.
                  </p>
                  <Button type="primary" icon={<LuPlus size={15} />} onClick={() => openTierModal()}>
                    Thêm hạng mới
                  </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {tiers.map((tier) => {
                    const memberCount = store.customers.filter(
                      (c) => c.tier.toLowerCase() === tier.name.toLowerCase(),
                    ).length;
                    return (
                      <div
                        key={tier.id}
                        className="flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                      >
                        <div>
                          <div
                            className="p-4 text-white"
                            style={{ background: `linear-gradient(135deg, ${tier.color}, ${tier.color}cc)` }}
                          >
                            <div className="flex items-center justify-between">
                              <span className="inline-flex items-center gap-1.5 text-sm font-extrabold">
                                <LuCrown size={15} /> {tier.name}
                              </span>
                              <span className="rounded-full bg-white/20 px-2 py-0.5 text-2xs font-bold">
                                Giảm {tier.discountPercent}%
                              </span>
                            </div>
                            <div className="mt-2 text-xs text-white/85">
                              Chi tiêu từ: <b>{tier.minSpent.toLocaleString("vi-VN")}đ</b>
                            </div>
                          </div>

                          <div className="space-y-2 p-4 text-xs">
                            <div className="flex items-center justify-between text-slate-600">
                              <span>Ngưỡng điểm</span>
                              <span className="font-bold text-slate-900">{tier.minPoints} điểm</span>
                            </div>
                            <div className="flex items-center justify-between text-slate-600">
                              <span>Hệ số tích điểm</span>
                              <Tag color="gold" className="m-0 font-bold">
                                x{tier.pointMultiplier}
                              </Tag>
                            </div>
                            <div className="flex items-center justify-between text-slate-600">
                              <span>Khách đạt hạng</span>
                              <span className="inline-flex items-center gap-1 font-bold text-brand-600">
                                <LuUsers size={12} /> {memberCount} khách
                              </span>
                            </div>
                            {tier.benefits && (
                              <div className="rounded-xl bg-slate-50 p-2.5 text-xs leading-relaxed text-slate-600">
                                {tier.benefits}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-1.5 border-t border-slate-100 px-3 py-2">
                          <Button size="small" onClick={() => openTierModal(tier)}>
                            Sửa
                          </Button>
                          <Popconfirm title="Xoá hạng này?" onConfirm={() => deleteTier(tier.id)}>
                            <Button size="small" danger icon={<LuTrash2 size={13} />} />
                          </Popconfirm>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ),
          },
          {
            key: "stamps",
            label: (
              <span className="inline-flex items-center gap-1.5 font-semibold">
                <LuStamp size={15} /> Thẻ tích tem{store.stampProgram?.enabled ? ` (${store.stampProgram.required} tem)` : ""}
              </span>
            ),
            children: <StampProgramPanel store={store} applyLocal={applyLocal} />,
          },
          {
            key: "vouchers",
            label: (
              <span className="inline-flex items-center gap-1.5 font-semibold">
                <LuTicket size={15} /> Kho Voucher ({vouchers.length})
              </span>
            ),
            children: (
              <div className="space-y-4 pt-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-slate-500">
                    Tạo mã giảm giá, freeship hoặc ưu đãi riêng theo từng hạng thành viên trên Zalo Mini App.
                  </p>
                  <Button type="primary" icon={<LuPlus size={15} />} onClick={() => openVoucherModal()}>
                    Tạo Voucher
                  </Button>
                </div>

                <Table
                  rowKey="id"
                  size="small"
                  dataSource={vouchers}
                  pagination={{ pageSize: 8, hideOnSinglePage: true }}
                  columns={[
                    {
                      title: "Mã Voucher",
                      dataIndex: "code",
                      render: (code, r) => (
                        <div>
                          <span className="rounded-md bg-brand-50 px-2 py-0.5 font-mono text-xs font-extrabold text-brand-700">
                            {code}
                          </span>
                          <div className="mt-1 text-xs font-medium text-slate-800">{r.title}</div>
                        </div>
                      ),
                    },
                    {
                      title: "Mức ưu đãi",
                      render: (_, r) => (
                        <div className="text-xs">
                          <div className="font-bold text-rose-600">
                            {r.discountType === "percent"
                              ? `Giảm ${r.discountValue}%`
                              : r.discountType === "freeship"
                                ? `Freeship tối đa ${r.discountValue.toLocaleString("vi-VN")}đ`
                                : `Giảm ${r.discountValue.toLocaleString("vi-VN")}đ`}
                          </div>
                          <div className="text-xs text-slate-400">
                            Đơn tối thiểu: {r.minOrderValue.toLocaleString("vi-VN")}đ
                          </div>
                        </div>
                      ),
                    },
                    {
                      title: "Áp dụng hạng",
                      dataIndex: "tierCode",
                      render: (code) => {
                        if (!code || code === "all") return <Tag>Tất cả</Tag>;
                        const found = tiers.find((t) => t.code === code);
                        return <Tag color="gold">{found?.name ?? code}</Tag>;
                      },
                    },
                    {
                      title: "Lượt dùng",
                      width: 140,
                      render: (_, r) => {
                        const pct = r.quantity > 0 ? Math.min(100, Math.round((r.usedCount / r.quantity) * 100)) : 0;
                        return (
                          <div>
                            <div className="text-xs font-semibold text-slate-700">
                              {r.usedCount} / {r.quantity}
                            </div>
                            <Progress percent={pct} size="small" showInfo={false} />
                          </div>
                        );
                      },
                    },
                    {
                      title: "Mã thẻ",
                      width: 120,
                      render: (_, r) =>
                        r.codeCount ? (
                          <div className="text-xs">
                            <div className="font-bold text-slate-800">{r.codeCount.toLocaleString("vi-VN")} mã</div>
                            <div className="text-slate-400">đã dùng {(r.codeUsed ?? 0).toLocaleString("vi-VN")}</div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">Mã chung</span>
                        ),
                    },
                    {
                      title: "Hạn sử dụng",
                      render: (_, r) => (
                        <span className="text-xs text-slate-600">
                          {dayjs(r.startDate).format("DD/MM")} → {dayjs(r.endDate).format("DD/MM/YY")}
                        </span>
                      ),
                    },
                    {
                      title: "Bật",
                      dataIndex: "active",
                      render: (active, r) => (
                        <Switch size="small" checked={active} onChange={(v) => toggleVoucherActive(r.id, v)} />
                      ),
                    },
                    {
                      title: "",
                      align: "right",
                      render: (_, r) => (
                        <div className="flex justify-end gap-1">
                          <Button
                            size="small"
                            icon={<LuPrinter size={13} />}
                            disabled={r.id.startsWith("vc_")}
                            onClick={() => setCodesFor(r.id)}
                          >
                            Mã & in thẻ
                          </Button>
                          <Button size="small" onClick={() => openVoucherModal(r)}>
                            Sửa
                          </Button>
                          <Popconfirm title="Xoá voucher này?" onConfirm={() => deleteVoucher(r.id)}>
                            <Button size="small" danger icon={<LuTrash2 size={13} />} />
                          </Popconfirm>
                        </div>
                      ),
                    },
                  ]}
                />
              </div>
            ),
          },
        ]}
      />

      {codesFor && (
        <Suspense fallback={null}>
          <VoucherCodesDrawer
            open
            store={store}
            voucher={vouchers.find((v) => v.id === codesFor) ?? null}
            tierName={(() => {
              const code = vouchers.find((v) => v.id === codesFor)?.tierCode;
              return code && code !== "all" ? tiers.find((t) => t.code === code)?.name : undefined;
            })()}
            onClose={() => setCodesFor(null)}
            onStats={(id, st) =>
              applyLocal((s) => ({
                ...s,
                vouchers: (s.vouchers ?? []).map((v) =>
                  v.id === id ? { ...v, codeCount: st.codeCount, codeUsed: st.codeUsed, ...(st.quantity ? { quantity: st.quantity } : {}) } : v,
                ),
              }))
            }
          />
        </Suspense>
      )}

      {/* Modal thêm / sửa Hạng thành viên */}
      <Modal
        title={tierModal.item ? "Chỉnh sửa hạng thành viên" : "Thêm hạng thành viên mới"}
        open={tierModal.open}
        onCancel={() => setTierModal({ open: false })}
        footer={null}
        destroyOnHidden
      >
        <Form form={tierForm} layout="vertical" onFinish={saveTier}>
          <div className="grid gap-x-4 sm:grid-cols-2">
            <Form.Item name="name" label="Tên hạng" rules={[{ required: true, message: "Nhập tên hạng" }]}>
              <Input placeholder="VD: Bạch Kim" />
            </Form.Item>
            <Form.Item name="code" label="Mã hạng (không dấu)">
              <Input placeholder="VD: platinum" />
            </Form.Item>
          </div>
          <div className="grid gap-x-4 sm:grid-cols-2">
            <Form.Item name="minSpent" label="Chi tiêu tối thiểu (đ)" rules={[{ required: true }]}>
              <InputNumber className="w-full" min={0} step={500000} />
            </Form.Item>
            <Form.Item name="minPoints" label="Điểm tối thiểu" rules={[{ required: true }]}>
              <InputNumber className="w-full" min={0} step={50} />
            </Form.Item>
          </div>
          <div className="grid gap-x-4 sm:grid-cols-3">
            <Form.Item name="discountPercent" label="Chiết khấu (%)">
              <InputNumber className="w-full" min={0} max={100} />
            </Form.Item>
            <Form.Item name="pointMultiplier" label="Hệ số điểm">
              <InputNumber className="w-full" min={1} max={10} step={0.1} />
            </Form.Item>
            <Form.Item name="color" label="Màu thẻ">
              <ColorPicker showText />
            </Form.Item>
          </div>
          <Form.Item name="benefits" label="Quyền lợi hạng">
            <Input.TextArea rows={2} placeholder="Mô tả quyền lợi nổi bật của hạng..." />
          </Form.Item>
          <Button type="primary" htmlType="submit" block className="font-bold">
            Lưu hạng thành viên
          </Button>
        </Form>
      </Modal>

      {/* Modal thêm / sửa Voucher */}
      <Modal
        title={voucherModal.item ? "Chỉnh sửa Voucher" : "Tạo Voucher mới"}
        open={voucherModal.open}
        onCancel={() => setVoucherModal({ open: false })}
        footer={null}
        destroyOnHidden
      >
        <Form form={voucherForm} layout="vertical" onFinish={saveVoucher}>
          <div className="grid gap-x-4 sm:grid-cols-2">
            <Form.Item name="code" label="Mã Voucher" rules={[{ required: true, message: "Nhập mã voucher" }]}>
              <Input placeholder="VD: SALE20" className="uppercase" />
            </Form.Item>
            <Form.Item name="tierCode" label="Áp dụng cho hạng">
              <Select
                options={[
                  { value: "all", label: "Tất cả khách hàng" },
                  ...tiers.map((t) => ({ value: t.code, label: `Hạng ${t.name}` })),
                ]}
              />
            </Form.Item>
          </div>
          <Form.Item name="title" label="Tên chương trình / Mô tả" rules={[{ required: true, message: "Nhập tên voucher" }]}>
            <Input placeholder="VD: Giảm 20% cho đơn từ 399K" />
          </Form.Item>
          <div className="grid gap-x-4 sm:grid-cols-3">
            <Form.Item name="discountType" label="Loại ưu đãi">
              <Select
                options={[
                  { value: "percent", label: "Giảm %" },
                  { value: "fixed", label: "Giảm tiền (đ)" },
                  { value: "freeship", label: "Freeship" },
                ]}
              />
            </Form.Item>
            <Form.Item name="discountValue" label="Giá trị giảm" rules={[{ required: true }]}>
              <InputNumber className="w-full" min={0} />
            </Form.Item>
            <Form.Item name="quantity" label="Số lượng mã" rules={[{ required: true }]}>
              <InputNumber className="w-full" min={1} />
            </Form.Item>
          </div>
          <div className="grid gap-x-4 sm:grid-cols-2">
            <Form.Item name="minOrderValue" label="Đơn tối thiểu (đ)">
              <InputNumber className="w-full" min={0} step={50000} />
            </Form.Item>
            <Form.Item name="maxDiscount" label="Giảm tối đa (đ)">
              <InputNumber className="w-full" min={0} step={10000} />
            </Form.Item>
          </div>
          <div className="grid gap-x-4 sm:grid-cols-2">
            <Form.Item name="startDate" label="Ngày bắt đầu">
              <Input type="date" />
            </Form.Item>
            <Form.Item name="endDate" label="Ngày kết thúc">
              <Input type="date" />
            </Form.Item>
          </div>
          <Form.Item name="active" label="Kích hoạt ngay" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Button type="primary" htmlType="submit" block className="font-bold">
            Lưu Voucher
          </Button>
        </Form>
      </Modal>
    </div>
  );
}
