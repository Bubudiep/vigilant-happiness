import { Alert, App as AntApp, Button, Drawer, Empty, Input, Modal, Popconfirm, Select, Table, Tag } from "antd";
import dayjs from "dayjs";
import { useCallback, useEffect, useState } from "react";
import { LuPlus, LuRefreshCw, LuTrash2 } from "react-icons/lu";
import {
  addStaff,
  ApiError,
  AuditRow,
  deleteCustomer,
  fetchAudit,
  fetchCustomerDetail,
  fetchCustomerRows,
  PlatformCustomerDetail,
  PlatformCustomerRow,
  removeStaff,
  saveCustomer,
} from "../data/platform-api";

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

  const rows = (list.data ?? []).filter((c) => {
    const k = kw.trim().toLowerCase();
    return !k || `${c.name} ${c.companyName ?? ""} ${c.phone}`.toLowerCase().includes(k);
  });

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900">Khách hàng reMini</h3>
          <p className="text-xs text-slate-500">
            Khách đăng nhập Zalo bằng số trùng <b>SĐT khách hàng</b> hoặc <b>SĐT nhân sự</b> bên dưới sẽ thấy dự án và ticket trong Mini App.
          </p>
        </div>
        <div className="flex gap-2">
          <Input.Search allowClear placeholder="Tìm tên / SĐT" style={{ width: 200 }} onChange={(e) => setKw(e.target.value)} />
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
            { title: "Gói", render: (_, r) => (r.subscriptions[0] ? <Tag color="blue">{r.subscriptions[0].plan.name}</Tag> : <span className="text-xs text-slate-300">—</span>) },
            { title: "Hạn", width: 100, render: (_, r) => (r.subscriptions[0] ? <span className="text-[11px]">{dayjs(r.subscriptions[0].expiresAt).format("DD/MM/YYYY")}</span> : "") },
            { title: "Store", width: 70, render: (_, r) => r._count.stores },
            { title: "Nhân sự", width: 80, render: (_, r) => r._count.staff },
            { title: "Trạng thái", width: 100, render: (_, r) => <Tag color={r.status === "active" ? "green" : "default"}>{r.status === "active" ? "Hoạt động" : r.status}</Tag> },
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

      <Drawer open={!!openId} onClose={() => setOpenId(null)} width={460} title={detail ? detail.companyName || detail.name : "Khách hàng"}>
        {detail && (
          <div className="space-y-5 text-sm">
            <div className="flex flex-wrap gap-2">
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
