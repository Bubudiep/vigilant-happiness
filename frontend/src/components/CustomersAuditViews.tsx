import { Alert, App as AntApp, Button, Drawer, Empty, Input, Modal, Popconfirm, Segmented, Select, Table, Tag } from "antd";
import dayjs from "dayjs";
import { useCallback, useEffect, useState } from "react";
import { LuPlus, LuRefreshCw, LuTrash2 } from "react-icons/lu";
import {
  AccountRow,
  addStaff,
  ApiError,
  AuditRow,
  deleteCustomer,
  fetchAccounts,
  fetchAudit,
  fetchCustomerDetail,
  fetchCustomerRows,
  PlatformCustomerDetail,
  PlatformCustomerRow,
  removeStaff,
  saveCustomer,
  setAccountRole,
  setCustomerStatus,
} from "../data/platform-api";

const STATUS_TAG: Record<string, { color: string; label: string }> = {
  active: { color: "green", label: "Hoạt động" },
  pending: { color: "orange", label: "Chờ kích hoạt" },
  suspended: { color: "red", label: "Tạm khoá" },
};
const StatusTag = ({ status }: { status: string }) => {
  const t = STATUS_TAG[status] ?? { color: "default", label: status };
  return <Tag color={t.color} className="m-0">{t.label}</Tag>;
};

const errMsg = (e: unknown, fb = "Thao tác thất bại") => (e instanceof ApiError ? e.message : fb);

function useList<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fn());
    } catch (e) {
      setError(errMsg(e, "Không tải được dữ liệu"));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => {
    load();
  }, [load]);
  return { data, loading, error, load };
}

const Retry = ({ error, onRetry }: { error: string; onRetry: () => void }) => (
  <Alert type="warning" showIcon title="Không tải được dữ liệu" description={error} action={<Button size="small" onClick={onRetry}>Thử lại</Button>} />
);

// ═════════════════════════════ Khách hàng ═════════════════════════════

type EditState = { id: string | null; name: string; companyName: string; phone: string; email: string };

/** Khách hàng ký hợp đồng. SĐT khách / nhân sự là "chìa khoá" để họ đăng nhập Zalo trong Mini App và thấy dự án. */
export function CustomersPlatformSection() {
  const { message } = AntApp.useApp();
  const list = useList(fetchCustomerRows);
  const [kw, setKw] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending">("all");
  const [edit, setEdit] = useState<EditState | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<PlatformCustomerDetail | null>(null);
  const [staff, setStaff] = useState({ name: "", phone: "" });

  const loadDetail = useCallback(
    async (id: string) => {
      try {
        setDetail(await fetchCustomerDetail(id));
      } catch (e) {
        message.error(errMsg(e));
      }
    },
    [message],
  );

  useEffect(() => {
    setDetail(null);
    if (openId) loadDetail(openId);
  }, [openId, loadDetail]);

  const save = async () => {
    if (!edit) return;
    if (!edit.name.trim() || edit.phone.replace(/\D/g, "").length < 9) return message.warning("Nhập tên và SĐT hợp lệ");
    try {
      await saveCustomer(edit.id, { name: edit.name, companyName: edit.companyName || undefined, phone: edit.phone, email: edit.email || undefined });
      message.success("Đã lưu (SĐT tự chuẩn hoá về dạng 0xxxxxxxxx)");
      setEdit(null);
      list.load();
      if (edit.id) loadDetail(edit.id);
    } catch (e) {
      message.error(errMsg(e));
    }
  };

  const pendingCount = (list.data ?? []).filter((c) => c.status === "pending").length;
  const rows = (list.data ?? []).filter((c) => {
    if (statusFilter === "pending" && c.status !== "pending") return false;
    const k = kw.trim().toLowerCase();
    const emails = (c.users ?? []).map((u) => u.email ?? "").join(" ");
    return !k || `${c.name} ${c.companyName ?? ""} ${c.phone} ${emails}`.toLowerCase().includes(k);
  });

  const changeStatus = async (id: string, status: "active" | "suspended") => {
    try {
      await setCustomerStatus(id, status);
      message.success(status === "active" ? "Đã kích hoạt người bán" : "Đã tạm khoá người bán");
      list.load();
      if (openId === id) loadDetail(id);
    } catch (e) {
      message.error(errMsg(e));
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900">Khách hàng reMini</h3>
          <p className="text-xs text-slate-500">
            Khách đăng nhập Zalo bằng số trùng <b>SĐT khách hàng</b> hoặc <b>SĐT nhân sự</b> bên dưới sẽ thấy dự án và ticket trong Mini App.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Segmented
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as "all" | "pending")}
            options={[
              { value: "all", label: "Tất cả" },
              { value: "pending", label: `Chờ kích hoạt${pendingCount ? ` (${pendingCount})` : ""}` },
            ]}
          />
          <Input.Search allowClear placeholder="Tìm tên / SĐT / email" style={{ width: 200 }} onChange={(e) => setKw(e.target.value)} />
          <Button icon={<LuRefreshCw size={14} />} onClick={list.load} loading={list.loading} />
          <Button type="primary" icon={<LuPlus size={15} />} onClick={() => setEdit({ id: null, name: "", companyName: "", phone: "", email: "" })}>
            Thêm khách hàng
          </Button>
        </div>
      </div>

      {list.error ? (
        <Retry error={list.error} onRetry={list.load} />
      ) : (
        <Table<PlatformCustomerRow>
          rowKey="id"
          size="small"
          loading={list.loading}
          dataSource={rows}
          pagination={{ pageSize: 12 }}
          locale={{ emptyText: <Empty description="Chưa có khách hàng" /> }}
          onRow={(r) => ({ onClick: () => setOpenId(r.id), className: "cursor-pointer" })}
          columns={[
            {
              title: "Khách hàng",
              render: (_, r) => (
                <div>
                  <div className="text-sm font-semibold text-slate-900">{r.companyName || r.name}</div>
                  <div className="text-[11px] text-slate-500">{r.companyName ? r.name : ""}</div>
                </div>
              ),
            },
            { title: "SĐT Zalo", dataIndex: "phone", render: (v: string) => <span className="font-mono text-xs">{v}</span> },
            {
              title: "Tài khoản đăng nhập",
              render: (_, r) =>
                r.users?.length ? (
                  <div className="text-[11px] text-slate-600">{r.users.map((u) => <div key={u.id}>{u.email || u.name}</div>)}</div>
                ) : (
                  <span className="text-xs text-slate-300">—</span>
                ),
            },
            { title: "Gói", render: (_, r) => (r.subscriptions[0] ? <Tag color="blue">{r.subscriptions[0].plan.name}</Tag> : <span className="text-xs text-slate-300">—</span>) },
            { title: "Hạn", width: 100, render: (_, r) => (r.subscriptions[0] ? <span className="text-[11px]">{dayjs(r.subscriptions[0].expiresAt).format("DD/MM/YYYY")}</span> : "") },
            { title: "Store", width: 70, render: (_, r) => r._count.stores },
            { title: "Nhân sự", width: 80, render: (_, r) => r._count.staff },
            {
              title: "Trạng thái",
              width: 150,
              render: (_, r) =>
                r.status === "pending" ? (
                  <Button size="small" type="primary" onClick={(e) => { e.stopPropagation(); changeStatus(r.id, "active"); }}>
                    Kích hoạt
                  </Button>
                ) : (
                  <StatusTag status={r.status} />
                ),
            },
          ]}
        />
      )}

      <Modal title={edit?.id ? "Sửa khách hàng" : "Thêm khách hàng"} open={!!edit} onCancel={() => setEdit(null)} onOk={save} okText="Lưu" destroyOnHidden>
        {edit && (
          <div className="space-y-3 pt-2">
            <Input placeholder="Tên người liên hệ *" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
            <Input placeholder="Tên công ty / cửa hàng" value={edit.companyName} onChange={(e) => setEdit({ ...edit, companyName: e.target.value })} />
            <Input placeholder="SĐT Zalo *  (VD 0977 001 122)" value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} />
            <Input placeholder="Email" value={edit.email} onChange={(e) => setEdit({ ...edit, email: e.target.value })} />
          </div>
        )}
      </Modal>

      <Drawer open={!!openId} onClose={() => setOpenId(null)} size={460} title={detail ? detail.companyName || detail.name : "Khách hàng"}>
        {detail && (
          <div className="space-y-5 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <StatusTag status={detail.status} />
              {detail.status !== "active" ? (
                <Button size="small" type="primary" onClick={() => changeStatus(detail.id, "active")}>
                  Kích hoạt người bán
                </Button>
              ) : (
                <Popconfirm title="Tạm khoá? Người bán sẽ không vào được trang quản trị store." onConfirm={() => changeStatus(detail.id, "suspended")}>
                  <Button size="small">Tạm khoá</Button>
                </Popconfirm>
              )}
              <Button size="small" onClick={() => setEdit({ id: detail.id, name: detail.name, companyName: detail.companyName ?? "", phone: detail.phone, email: detail.email ?? "" })}>
                Sửa thông tin
              </Button>
              <Popconfirm
                title="Xoá khách hàng? Dự án, ticket, kênh API của khách cũng bị xoá."
                onConfirm={async () => {
                  await deleteCustomer(detail.id).catch((e) => message.error(errMsg(e)));
                  setOpenId(null);
                  list.load();
                }}
              >
                <Button size="small" danger icon={<LuTrash2 size={12} />}>
                  Xoá
                </Button>
              </Popconfirm>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
              <div>
                Liên hệ: {detail.name} · <span className="font-mono">{detail.phone}</span>
              </div>
              {detail.email && <div>Email: {detail.email}</div>}
              {detail.address && <div>Địa chỉ: {detail.address}</div>}
              {!!detail.users?.length && <div>Tài khoản: {detail.users.map((u) => u.email || u.name).join(", ")}</div>}
              {detail.note && <div>Ghi chú: {detail.note}</div>}
              <div>Store: {detail.stores.map((s) => s.name).join(", ") || "—"}</div>
            </div>
            <div>
              <div className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">Nhân sự được đăng nhập</div>
              <p className="mb-2 text-[11px] text-slate-500">Thêm số Zalo của nhân viên khách hàng để họ cũng xem được dự án của công ty.</p>
              <div className="space-y-1.5">
                {detail.staff.map((s) => (
                  <div key={s.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-1.5">
                    <div>
                      <div className="text-sm font-semibold">{s.name}</div>
                      <div className="font-mono text-[11px] text-slate-500">{s.phone}</div>
                    </div>
                    <Popconfirm title="Xoá nhân sự?" onConfirm={() => removeStaff(s.id).then(() => loadDetail(detail.id)).catch((e) => message.error(errMsg(e)))}>
                      <Button size="small" type="text" danger icon={<LuTrash2 size={12} />} />
                    </Popconfirm>
                  </div>
                ))}
                {detail.staff.length === 0 && <div className="text-xs text-slate-400">Chưa có nhân sự</div>}
              </div>
              <div className="mt-2 flex gap-2">
                <Input size="small" placeholder="Tên" value={staff.name} onChange={(e) => setStaff({ ...staff, name: e.target.value })} />
                <Input size="small" placeholder="SĐT Zalo" value={staff.phone} onChange={(e) => setStaff({ ...staff, phone: e.target.value })} />
                <Button
                  size="small"
                  type="primary"
                  onClick={async () => {
                    if (!staff.name.trim() || staff.phone.replace(/\D/g, "").length < 9) return message.warning("Nhập tên và SĐT");
                    try {
                      await addStaff(detail.id, { name: staff.name.trim(), phone: staff.phone });
                      setStaff({ name: "", phone: "" });
                      loadDetail(detail.id);
                      list.load();
                    } catch (e) {
                      message.error(errMsg(e));
                    }
                  }}
                >
                  Thêm
                </Button>
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}

// ═════════════════════════════ Nhật ký thao tác ═════════════════════════════

const ACTION_LABEL: Record<string, string> = {
  "oauth.app.create": "Tạo kênh API",
  "oauth.app.update": "Sửa kênh API",
  "oauth.app.disable": "Tắt kênh API",
  "oauth.app.rotate_secret": "Đổi secret kênh",
  "oauth.app.revoke_tokens": "Thu hồi token kênh",
  "oauth.app.delete": "Xoá kênh API",
  "store.update": "Sửa cấu hình store",
  "spam.block.add": "Chặn spam",
  "spam.block.remove": "Bỏ chặn spam",
  "project.create": "Tạo dự án",
  "project.update": "Sửa dự án",
  "project.delete": "Xoá dự án",
  "ticket.update": "Sửa ticket",
  "inbox.conversation.update": "Sửa hội thoại",
  "inbox.file.delete": "Xoá ảnh khách",
  "inbox.oa.credentials": "Đổi token Zalo OA",
  "debt.create": "Tạo khoản nợ",
  "debt.update": "Sửa khoản nợ",
  "debt.delete": "Xoá khoản nợ",
  "debt.payment": "Thu tiền nợ",
  "debt.payment_delete": "Huỷ lần thu",
};
const GROUPS = [
  { value: "", label: "Tất cả" },
  { value: "oauth", label: "Kênh API" },
  { value: "store", label: "Store" },
  { value: "spam", label: "Chống spam" },
  { value: "project", label: "Dự án" },
  { value: "ticket", label: "Ticket" },
  { value: "debt", label: "Công nợ" },
  { value: "inbox", label: "Hộp thư" },
];

export function AuditSection() {
  const [group, setGroup] = useState("");
  const list = useList(() => fetchAudit(group || undefined), [group]);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900">Nhật ký thao tác</h3>
          <p className="text-xs text-slate-500">Ai đã làm gì, lúc nào, từ IP nào. Secret / token không bao giờ được ghi lại.</p>
        </div>
        <div className="flex gap-2">
          <Select value={group} onChange={setGroup} style={{ width: 150 }} options={GROUPS} />
          <Button icon={<LuRefreshCw size={14} />} onClick={list.load} loading={list.loading} />
        </div>
      </div>
      {list.error ? (
        <Retry error={list.error} onRetry={list.load} />
      ) : (
        <Table<AuditRow>
          rowKey="id"
          size="small"
          loading={list.loading}
          dataSource={list.data ?? []}
          pagination={{ pageSize: 15 }}
          locale={{ emptyText: <Empty description="Chưa có thao tác nào" /> }}
          columns={[
            { title: "Lúc", width: 120, render: (_, r) => <span className="text-[11px]">{dayjs(r.createdAt).format("HH:mm:ss DD/MM")}</span> },
            { title: "Người thực hiện", render: (_, r) => <span className="text-xs">{r.actorLabel}</span> },
            { title: "Thao tác", render: (_, r) => <Tag>{ACTION_LABEL[r.action] ?? r.action}</Tag> },
            { title: "Đối tượng", render: (_, r) => <span className="font-mono text-[11px] text-slate-500">{r.targetType} {r.targetId}</span> },
            { title: "Chi tiết", render: (_, r) => <span className="text-[11px] text-slate-500">{r.meta ? JSON.stringify(r.meta) : ""}</span> },
            { title: "IP", width: 120, render: (_, r) => <span className="font-mono text-[11px]">{r.ip}</span> },
          ]}
        />
      )}
    </div>
  );
}

// ═════════════════════════════ Tài khoản quản trị ═════════════════════════════

/** Đánh dấu tài khoản Google nào là "Quản trị nền tảng" (thấy mọi store, duyệt người bán…). */
export function AccountsSection({ currentUserId }: { currentUserId: string }) {
  const { message } = AntApp.useApp();
  const list = useList(fetchAccounts);
  const [kw, setKw] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const rows = (list.data ?? []).filter((a) => {
    const k = kw.trim().toLowerCase();
    return !k || `${a.name} ${a.email ?? ""} ${a.customer?.companyName ?? ""}`.toLowerCase().includes(k);
  });

  const toggle = async (a: AccountRow, admin: boolean) => {
    setBusy(a.id);
    try {
      await setAccountRole(a.id, admin ? "admin" : "owner");
      message.success(admin ? `Đã đánh dấu ${a.email ?? a.name} là quản trị nền tảng` : "Đã gỡ quyền quản trị nền tảng");
      list.load();
    } catch (e) {
      message.error(errMsg(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900">Tài khoản quản trị</h3>
          <p className="text-xs text-slate-500">
            Tài khoản được đánh dấu <b>Quản trị nền tảng</b> thấy mọi gian hàng, duyệt người bán và dùng các mục quản trị.
            Tài khoản khác là chủ shop — chỉ quản lý gian hàng của mình.
          </p>
        </div>
        <div className="flex gap-2">
          <Input.Search allowClear placeholder="Tìm tên / email" style={{ width: 220 }} onChange={(e) => setKw(e.target.value)} />
          <Button icon={<LuRefreshCw size={14} />} onClick={list.load} loading={list.loading} />
        </div>
      </div>
      {list.error ? (
        <Retry error={list.error} onRetry={list.load} />
      ) : (
        <Table<AccountRow>
          rowKey="id"
          size="small"
          loading={list.loading}
          dataSource={rows}
          pagination={{ pageSize: 15 }}
          locale={{ emptyText: <Empty description="Chưa có tài khoản" /> }}
          columns={[
            {
              title: "Tài khoản",
              render: (_, a) => (
                <div className="flex items-center gap-2.5">
                  {a.avatarUrl ? (
                    <img src={a.avatarUrl} alt="" referrerPolicy="no-referrer" className="h-8 w-8 rounded-lg object-cover" />
                  ) : (
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-200 text-xs font-bold text-slate-600">
                      {a.name.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      {a.name} {a.id === currentUserId && <span className="text-[11px] font-normal text-slate-400">(bạn)</span>}
                    </div>
                    <div className="text-[11px] text-slate-500">{a.email}</div>
                  </div>
                </div>
              ),
            },
            {
              title: "Người bán",
              render: (_, a) =>
                a.customer ? (
                  <div className="text-xs">
                    <div className="font-semibold text-slate-800">{a.customer.companyName || a.customer.name}</div>
                    <StatusTag status={a.customer.status} />
                  </div>
                ) : (
                  <span className="text-xs text-slate-300">—</span>
                ),
            },
            {
              title: "Đăng nhập gần nhất",
              width: 150,
              render: (_, a) => <span className="text-[11px] text-slate-500">{dayjs(a.lastLoginAt).format("DD/MM/YYYY HH:mm")}</span>,
            },
            {
              title: "Vai trò",
              width: 220,
              render: (_, a) =>
                a.adminViaEnv ? (
                  <Tag color="purple" className="m-0">Quản trị (ADMIN_EMAILS)</Tag>
                ) : a.isAdmin ? (
                  <div className="flex items-center gap-2">
                    <Tag color="purple" className="m-0">Quản trị nền tảng</Tag>
                    {a.id !== currentUserId && (
                      <Popconfirm title="Gỡ quyền quản trị nền tảng?" onConfirm={() => toggle(a, false)}>
                        <Button size="small" type="link" danger loading={busy === a.id}>
                          Gỡ
                        </Button>
                      </Popconfirm>
                    )}
                  </div>
                ) : (
                  <Popconfirm
                    title="Đánh dấu là quản trị nền tảng?"
                    description="Tài khoản này sẽ thấy và sửa được mọi gian hàng."
                    onConfirm={() => toggle(a, true)}
                  >
                    <Button size="small" loading={busy === a.id}>
                      Đặt làm quản trị
                    </Button>
                  </Popconfirm>
                ),
            },
          ]}
        />
      )}
    </div>
  );
}
