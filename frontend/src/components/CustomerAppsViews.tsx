import { App as AntApp, Button, Drawer, Modal, Dropdown, Form, Grid, Input, Popover, QRCode, Select, Switch, Table, Tag, Tooltip } from "antd";
import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LuEllipsis, LuExternalLink, LuLayoutTemplate, LuPencil, LuQrCode, LuRefreshCw, LuSearch, LuStore, LuTrash2 } from "react-icons/lu";
import { useNavigate } from "react-router-dom";
import { api, ApiError, fetchPlatformCustomers, fetchSubscriptions, PlatformCustomerLite, SubscriptionRow } from "../data/platform-api";
import { demoTemplates, getZaloStoreUrl } from "../data/site";
import { fmtBytes } from "../data/format";
import { fetchStoreStorage, type StoreStorage } from "../data/platform-api";
import { deleteStore, forgetDeletedStore, slugConfirmed } from "../data/store-delete";
import { fetchStores, StoreWithOwner } from "../data/store-api";
import { FilterBar, FilterSelect, PageHeader } from "./ui";

const errMsg = (e: unknown, fb = "Thao tác thất bại") => (e instanceof ApiError ? e.message : fb);

/** Store trong danh sách admin (backend kèm chủ, gói, OA). */
type AppRow = StoreWithOwner & {
  logoUrl?: string | null;
  customerId?: string | null;
  zaloOaId?: string | null;
  subscriptionId?: string | null;
  subscription?: { id: string; status: string; expiresAt: string; plan: { name: string } } | null;
  customer?: { id: string; name: string; companyName?: string | null; phone?: string } | null;
  updatedAt?: string;
  _count?: { products: number; customers: number };
};

/** Mở trang quản trị shop đúng store này (StoreConsole đọc store đã chọn gần nhất). */
export function openStoreAsAdmin(navigate: (to: string) => void, storeId: string, section = "overview") {
  try {
    localStorage.setItem("recloud_last_store_v1", storeId);
  } catch {
    // bỏ qua
  }
  navigate(`/admin/${section}`);
}

const SUB_COLOR: Record<string, string> = { active: "green", trial: "blue", expired: "red", cancelled: "default" };
const templateName = (id: string) => demoTemplates.find((t) => t.id === id)?.name ?? id;

// ═════════════════════════════ Cấu hình app của khách ═════════════════════════════

export function CustomerAppsSection() {
  const { message } = AntApp.useApp();
  const navigate = useNavigate();
  const wide = !!Grid.useBreakpoint().lg; // bảng đầy đủ + cuộn ngang từ lg; nhỏ hơn: ẩn cột phụ
  const [rows, setRows] = useState<AppRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [filter, setFilter] = useState<"all" | "own_app" | "no_plan" | "expiring" | "off">("all");
  const [editing, setEditing] = useState<AppRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows((await fetchStores()) as AppRow[]);
    } catch (e) {
      message.error(errMsg(e, "Không tải được danh sách app"));
    } finally {
      setLoading(false);
    }
  }, [message]);
  useEffect(() => {
    load();
  }, [load]);

  const toggleActive = async (r: AppRow, active: boolean) => {
    try {
      await api(`/stores/${r.id}/config`, { method: "PATCH", body: JSON.stringify({ active }) });
      setRows((list) => list?.map((x) => (x.id === r.id ? { ...x, active } : x)) ?? null);
      message.success(active ? `Đã bật app "${r.name}"` : `Đã tạm tắt app "${r.name}"`);
    } catch (e) {
      message.error(errMsg(e));
    }
  };

  const soon = dayjs().add(15, "day");
  const shown = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return (rows ?? []).filter((r) => {
      if (kw && ![r.name, r.slug, r.customer?.name, r.customer?.companyName, r.customer?.phone, r.zaloAppId].some((x) => x?.toLowerCase().includes(kw)))
        return false;
      if (filter === "own_app") return !!r.zaloAppId;
      if (filter === "no_plan") return !r.subscription;
      if (filter === "expiring") return !!r.subscription && dayjs(r.subscription.expiresAt).isBefore(soon);
      if (filter === "off") return !r.active;
      return true;
    });
  }, [rows, keyword, filter, soon]);

  const counts = useMemo(() => {
    const l = rows ?? [];
    return {
      all: l.length,
      own_app: l.filter((r) => r.zaloAppId).length,
      no_plan: l.filter((r) => !r.subscription).length,
      expiring: l.filter((r) => r.subscription && dayjs(r.subscription.expiresAt).isBefore(soon)).length,
      off: l.filter((r) => !r.active).length,
    };
  }, [rows, soon]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <PageHeader
        title="Cấu hình app của khách"
        description={<>Sửa thông tin, Zalo App / OA, đổi chủ, gắn gói — hoặc mở thẳng trang quản trị / Miniapp Studio của khách để hỗ trợ, cập nhật hộ.</>}
      />
      <FilterBar
        search={
          <Input
            allowClear
            prefix={<LuSearch size={14} className="text-slate-400" />}
            placeholder="Tên app, slug, khách, SĐT, App ID"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        }
        filters={
          <FilterSelect
            popupMatchSelectWidth={false}
            value={filter}
            onChange={setFilter}
            options={(
              [
                ["all", "Tất cả"],
                ["own_app", "Có App ID riêng"],
                ["no_plan", "Chưa gắn gói"],
                ["expiring", "Gói sắp / đã hết hạn"],
                ["off", "Đang tắt"],
              ] as const
            ).map(([k, label]) => ({ value: k, label: `${label} (${counts[k]})` }))}
          />
        }
        actions={<Button icon={<LuRefreshCw size={14} />} onClick={load} loading={loading} />}
      />
        <Table<AppRow>
          rowKey="id"
          size="middle"
          loading={loading && !rows}
          dataSource={shown}
          pagination={{ pageSize: 20, hideOnSinglePage: true }}
          scroll={{ x: wide ? 1110 : "max-content" }}
          columns={[
            {
              title: "App",
              key: "app",
              width: wide ? 210 : undefined,
              render: (_, r) => (
                <div className="flex items-center gap-2.5">
                  {r.logoUrl ? (
                    <img src={r.logoUrl} alt="" className="h-9 w-9 rounded-xl object-cover" />
                  ) : (
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-black text-white"
                      style={{ background: r.theme?.primary || "#1657f3" }}
                    >
                      {r.name.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0">
                    <div className="truncate font-bold text-slate-900">{r.name}</div>
                    <div className="truncate text-xs text-slate-500">
                      /{r.slug} · {templateName(r.templateId)}
                    </div>
                  </div>
                </div>
              ),
            },
            {
              title: "Khách sở hữu",
              responsive: ["md"],
              key: "owner",
              width: 160,
              render: (_, r) =>
                r.customer ? (
                  <div className="text-xs">
                    <div className="font-semibold text-slate-800">{r.customer.companyName || r.customer.name}</div>
                    <div className="text-slate-500">{r.customer.phone}</div>
                  </div>
                ) : (
                  <Tag className="m-0">Chưa gắn khách</Tag>
                ),
            },
            {
              title: "Gói",
              responsive: ["lg"],
              key: "plan",
              width: 150,
              render: (_, r) => {
                if (!r.subscription) return <span className="text-xs text-slate-400">—</span>;
                const exp = dayjs(r.subscription.expiresAt);
                const left = exp.diff(dayjs(), "day");
                return (
                  <div className="text-xs">
                    <Tag color={SUB_COLOR[r.subscription.status] ?? "default"} className="m-0">
                      {r.subscription.plan.name}
                    </Tag>
                    <div className={`mt-0.5 ${left < 0 ? "font-semibold text-rose-600" : left <= 15 ? "font-semibold text-amber-600" : "text-slate-500"}`}>
                      {left < 0 ? `Hết hạn ${exp.format("DD/MM/YYYY")}` : `Hạn ${exp.format("DD/MM/YYYY")} · còn ${left} ngày`}
                    </div>
                  </div>
                );
              },
            },
            {
              title: "Zalo",
              responsive: ["lg"],
              key: "zalo",
              width: 140,
              render: (_, r) => (
                <div className="flex flex-col items-start gap-1 text-xs">
                  {r.zaloAppId ? (
                    <Tooltip title={`App ID ${r.zaloAppId}${r.hasZaloAppSecret ? " · đã có App Secret" : " · chưa có App Secret"}`}>
                      <Tag color={r.hasZaloAppSecret ? "blue" : "orange"} className="m-0">
                        App riêng
                      </Tag>
                    </Tooltip>
                  ) : (
                    <Tag className="m-0">Dùng app reMini</Tag>
                  )}
                  {r.zaloOaId ? <Tag color="cyan" className="m-0">OA {r.zaloOaId}</Tag> : <span className="text-slate-400">Chưa có OA</span>}
                </div>
              ),
            },
            {
              title: "Dữ liệu",
              responsive: ["lg"],
              key: "count",
              width: 100,
              render: (_, r) => (
                <div className="text-xs text-slate-500">
                  {r._count?.products ?? 0} sản phẩm
                  <br />
                  {r._count?.customers ?? 0} khách
                </div>
              ),
            },
            {
              title: "Bật",
              responsive: ["md"],
              key: "active",
              width: 60,
              render: (_, r) => <Switch size="small" checked={r.active} onChange={(v) => toggleActive(r, v)} />,
            },
            {
              title: "Cập nhật",
              responsive: ["lg"],
              key: "updated",
              width: 120,
              render: (_, r) => <span className="whitespace-nowrap text-xs tabular-nums text-slate-500">{r.updatedAt ? dayjs(r.updatedAt).format("HH:mm DD/MM/YY") : "—"}</span>,
            },
            {
              title: "",
              key: "actions",
              fixed: wide ? "right" : undefined,
              width: wide ? 150 : 110,
              render: (_, r) => (
                <div className="flex items-center justify-end gap-1">
                  <Popover
                    trigger="click"
                    content={
                      <div className="text-center">
                        <QRCode value={getZaloStoreUrl(r.slug)} size={150} bordered={false} />
                        <div className="mt-1 text-xs text-slate-500">Quét bằng Zalo để xem app của khách</div>
                      </div>
                    }
                  >
                    <Tooltip title="QR xem trước">
                      <Button size="small" icon={<LuQrCode size={14} />} />
                    </Tooltip>
                  </Popover>
                  <Button size="small" icon={<LuPencil size={13} />} onClick={() => setEditing(r)} aria-label="Cấu hình">
                    {wide && "Cấu hình"}
                  </Button>
                  <Dropdown
                    trigger={["click"]}
                    menu={{
                      items: [
                        { key: "admin", icon: <LuStore size={14} />, label: "Mở trang quản trị của khách", onClick: () => openStoreAsAdmin(navigate, r.id) },
                        { key: "studio", icon: <LuLayoutTemplate size={14} />, label: "Sửa giao diện (Miniapp Studio)", onClick: () => openStoreAsAdmin(navigate, r.id, "miniapp") },
                        {
                          key: "open",
                          icon: <LuExternalLink size={14} />,
                          label: (
                            <a href={getZaloStoreUrl(r.slug)} target="_blank" rel="noreferrer">
                              Mở link Zalo Mini App
                            </a>
                          ),
                        },
                      ],
                    }}
                  >
                    <Button size="small" icon={<LuEllipsis size={15} />} aria-label="Thêm" />
                  </Dropdown>
                </div>
              ),
            },
          ]}
        />
      </div>

      <AppConfigDrawer
        app={editing}
        onClose={() => setEditing(null)}
        onDeleted={(id) => {
          setEditing(null);
          setRows((list) => (list ?? []).filter((r) => r.id !== id));
        }}
        onSaved={() => {
          setEditing(null);
          load();
        }}
      />
    </div>
  );
}

// ═════════════════════════════ Drawer sửa cấu hình ═════════════════════════════

function AppConfigDrawer({ app, onClose, onSaved, onDeleted }: { app: AppRow | null; onClose: () => void; onSaved: () => void; onDeleted: (id: string) => void }) {
  const { message } = AntApp.useApp();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [customers, setCustomers] = useState<PlatformCustomerLite[]>([]);
  const [subs, setSubs] = useState<SubscriptionRow[]>([]);
  const [saving, setSaving] = useState(false);
  const customerId = Form.useWatch("customerId", form) as string | undefined;

  useEffect(() => {
    if (!app) return;
    form.setFieldsValue({
      name: app.name,
      subtitle: app.subtitle,
      phone: app.phone,
      address: app.address,
      templateId: app.templateId,
      zaloAppId: app.zaloAppId,
      zaloAppSecret: "",
      zaloOaId: app.zaloOaId,
      active: app.active,
      customerId: app.customer?.id ?? app.customerId ?? undefined,
      subscriptionId: app.subscriptionId ?? undefined,
    });
    fetchPlatformCustomers().then(setCustomers).catch(() => undefined);
  }, [app, form]);

  useEffect(() => {
    if (!customerId) return setSubs([]);
    fetchSubscriptions(customerId).then(setSubs).catch(() => setSubs([]));
  }, [customerId]);

  const save = async () => {
    if (!app) return;
    const v = await form.validateFields();
    // Chỉ gửi trường đã đổi
    const before: Record<string, unknown> = {
      name: app.name,
      subtitle: app.subtitle ?? "",
      phone: app.phone ?? "",
      address: app.address ?? "",
      templateId: app.templateId,
      zaloAppId: app.zaloAppId ?? "",
      zaloOaId: app.zaloOaId ?? "",
      active: app.active,
      customerId: app.customer?.id ?? app.customerId ?? null,
      subscriptionId: app.subscriptionId ?? null,
    };
    const patch: Record<string, unknown> = {};
    for (const k of Object.keys(before)) {
      const nv = k === "customerId" || k === "subscriptionId" ? (v[k] ?? null) : typeof v[k] === "string" ? v[k].trim() : v[k];
      if (nv !== before[k] && !(nv == null && before[k] === "")) patch[k] = nv ?? "";
    }
    if (patch.customerId === "") patch.customerId = null;
    if (patch.subscriptionId === "") patch.subscriptionId = null;
    if (v.zaloAppSecret?.trim()) patch.zaloAppSecret = v.zaloAppSecret.trim();
    if (!Object.keys(patch).length) return onClose();
    setSaving(true);
    try {
      await api(`/stores/${app.id}/config`, { method: "PATCH", body: JSON.stringify(patch) });
      message.success("Đã lưu cấu hình app");
      onSaved();
    } catch (e) {
      message.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      open={!!app}
      onClose={onClose}
      size={520}
      title={app ? `Cấu hình app · ${app.name}` : ""}
      extra={
        <Button type="primary" loading={saving} onClick={save}>
          Lưu
        </Button>
      }
    >
      {app && (
        <Form form={form} layout="vertical" requiredMark={false}>
          <div className="mb-4 flex flex-wrap gap-2">
            <Button icon={<LuStore size={14} />} onClick={() => openStoreAsAdmin(navigate, app.id)}>
              Mở trang quản trị
            </Button>
            <Button icon={<LuLayoutTemplate size={14} />} onClick={() => openStoreAsAdmin(navigate, app.id, "miniapp")}>
              Sửa giao diện
            </Button>
          </div>

          <Section title="Thông tin app">
            <Form.Item name="name" label="Tên app" rules={[{ required: true, message: "Nhập tên" }]}>
              <Input maxLength={100} />
            </Form.Item>
            <Form.Item name="subtitle" label="Mô tả ngắn">
              <Input maxLength={200} />
            </Form.Item>
            <div className="grid gap-x-4 sm:grid-cols-2">
              <Form.Item name="phone" label="SĐT cửa hàng">
                <Input maxLength={20} />
              </Form.Item>
              <Form.Item name="templateId" label="Mẫu giao diện">
                <Select showSearch optionFilterProp="label" options={demoTemplates.map((t) => ({ value: t.id, label: `${t.code} · ${t.name}` }))} />
              </Form.Item>
            </div>
            <Form.Item name="address" label="Địa chỉ">
              <Input maxLength={300} />
            </Form.Item>
            <Form.Item name="active" label="Trạng thái" valuePropName="checked">
              <Switch checkedChildren="Đang chạy" unCheckedChildren="Tạm tắt" />
            </Form.Item>
          </Section>

          <Section title="Zalo Mini App & OA riêng">
            <Form.Item name="zaloAppId" label="Mini App ID" extra="Để trống = dùng app reMini (link ?store=slug)">
              <Input maxLength={25} />
            </Form.Item>
            <Form.Item
              name="zaloAppSecret"
              label="App Secret"
              extra={app.hasZaloAppSecret ? "Đã lưu (mã hoá) — chỉ nhập khi cần thay" : "Chưa có — lấy ở mini.zalo.me → Cài đặt"}
            >
              <Input.Password autoComplete="new-password" placeholder={app.hasZaloAppSecret ? "••••••••" : ""} maxLength={200} />
            </Form.Item>
            <Form.Item name="zaloOaId" label="OA ID">
              <Input maxLength={30} />
            </Form.Item>
          </Section>

          <Section title="Chủ sở hữu & gói">
            <Form.Item name="customerId" label="Khách hàng reMini">
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder="Chưa gắn khách"
                options={customers.map((c) => ({ value: c.id, label: `${c.companyName || c.name} · ${c.phone}` }))}
                onChange={() => form.setFieldValue("subscriptionId", undefined)}
              />
            </Form.Item>
            <Form.Item name="subscriptionId" label="Gói đăng ký" extra="Tạo / gia hạn gói ở mục Gói dịch vụ">
              <Select
                allowClear
                disabled={!customerId}
                placeholder={customerId ? (subs.length ? "Chọn gói của khách" : "Khách chưa có gói") : "Chọn khách trước"}
                options={subs.map((s) => ({
                  value: s.id,
                  label: `${s.plan.name} · ${s.billingCycle === "yearly" ? "năm" : "tháng"} · hạn ${dayjs(s.expiresAt).format("DD/MM/YYYY")} · ${s.status}`,
                }))}
              />
            </Form.Item>
          </Section>
        </Form>
      )}
      {app && <DangerZone app={app} onDeleted={onDeleted} />}
    </Drawer>
  );
}

/** Vùng "Nguy hiểm": xoá HẲN gian hàng (chỉ trang điều hành của quản trị viên). */
function DangerZone({ app, onDeleted }: { app: AppRow; onDeleted: (id: string) => void }) {
  const { message } = AntApp.useApp();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [storage, setStorage] = useState<StoreStorage | null>(null);

  useEffect(() => {
    if (!open) return;
    setTyped("");
    setStorage(null);
    fetchStoreStorage(app.id).then(setStorage).catch(() => setStorage(null));
  }, [open, app.id]);

  const confirm = async () => {
    setBusy(true);
    try {
      const r = await deleteStore(app.id);
      forgetDeletedStore(app.id);
      setOpen(false);
      message.success(`Đã xoá gian hàng ${r.name || app.name} (${r.files} file)`);
      onDeleted(app.id);
    } catch (e) {
      message.error(errMsg(e, "Không xoá được gian hàng"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-6 rounded-xl border border-red-200 bg-red-50/60 p-4">
      <div className="text-xs font-bold uppercase tracking-wide text-red-600">Nguy hiểm</div>
      <p className="mt-1 text-xs text-slate-600">Xoá hẳn gian hàng cùng toàn bộ dữ liệu và ảnh. Không thể khôi phục.</p>
      <Button danger className="mt-2" icon={<LuTrash2 size={14} />} onClick={() => setOpen(true)}>
        Xoá gian hàng
      </Button>
      <Modal
        open={open}
        title={<span className="text-red-600">Xoá gian hàng “{app.name}”?</span>}
        onCancel={() => !busy && setOpen(false)}
        okText="Xoá vĩnh viễn"
        cancelText="Huỷ"
        okButtonProps={{ danger: true, disabled: !slugConfirmed(typed, app.slug), loading: busy }}
        onOk={confirm}
        destroyOnHidden
      >
        <div className="space-y-3 text-sm">
          <div className="text-slate-700">Các dữ liệu sau sẽ bị xoá hẳn và không thể khôi phục:</div>
          <ul className="list-disc space-y-0.5 pl-5 text-slate-700">
            <li>{app._count ? `${app._count.products} sản phẩm` : "Sản phẩm"}</li>
            <li>{app._count ? `${app._count.customers} khách hàng` : "Khách hàng"}</li>
            <li>Đơn hàng, lịch hẹn, album, hội thoại và cấu hình của gian hàng</li>
            <li>
              Ảnh &amp; file:{" "}
              {storage
                ? `${fmtBytes(storage.usedBytes)} (${storage.albumPhotos} ảnh album, ${storage.mediaFiles} ảnh thư viện)`
                : "đang tính dung lượng…"}
            </li>
          </ul>
          <div>
            Gõ <b className="font-mono">{app.slug}</b> để xác nhận:
          </div>
          <Input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={app.slug} autoComplete="off" status={typed && !slugConfirmed(typed, app.slug) ? "error" : undefined} />
        </div>
      </Modal>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{title}</div>
      {children}
    </div>
  );
}
