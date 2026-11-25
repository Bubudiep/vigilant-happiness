import { Alert, App as AntApp, Button, Empty, Input, Modal, Popconfirm, Segmented, Select, Switch, Table, Tag, Tooltip } from "antd";
import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LuBadgeCheck, LuCopy, LuDownload, LuKeyRound, LuPhone, LuPlus, LuRefreshCw, LuRotateCcw, LuTrash2 } from "react-icons/lu";
import {
  ApiError,
  Channel,
  createOAuthApp,
  deleteOAuthApp,
  fetchLeads,
  fetchOAuthApps,
  Lead,
  LeadStatus,
  OAuthApp,
  revokeOAuthTokens,
  rotateOAuthSecret,
  updateLead,
  updateOAuthApp,
} from "../data/platform-api";
import { siteConfig } from "../data/site";
import { FilterBar, FilterSelect, PageHeader } from "./ui";

const STATUS: Record<LeadStatus, { label: string; color: string }> = {
  NEW: { label: "Chưa gọi", color: "orange" },
  CONTACTED: { label: "Đã liên hệ", color: "blue" },
  CONVERTED: { label: "Chốt hợp đồng", color: "green" },
  ARCHIVED: { label: "Lưu trữ", color: "default" },
};

/** Xuất CSV (UTF-8 có BOM để Excel đọc đúng tiếng Việt; ô bắt đầu bằng = + - @ được chặn công thức). */
export function downloadCsv(filename: string, rows: (string | number | null | undefined)[][]) {
  const cell = (v: string | number | null | undefined) => {
    let s = v == null ? "" : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return `"${s.replace(/"/g, '""')}"`;
  };
  const csv = rows.map((r) => r.map(cell).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function ErrorBox({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <Alert
      type="warning"
      showIcon
      title="Không tải được dữ liệu"
      description={error}
      action={
        <Button size="small" onClick={onRetry}>
          Thử lại
        </Button>
      }
    />
  );
}

// ═════════════════════════════ Lịch gọi lại ═════════════════════════════

/** Danh sách khách đặt lịch gọi lại / yêu cầu tư vấn từ Mini App reMini (dữ liệu thật từ backend). */
export function CallbacksSection() {
  const { message } = AntApp.useApp();
  const [tab, setTab] = useState<"callback" | "consultation">("callback");
  const [status, setStatus] = useState<LeadStatus | "">("NEW");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setLeads(await fetchLeads({ requestType: tab, status: status || undefined }));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Lỗi không xác định");
    } finally {
      setLoading(false);
    }
  }, [tab, status]);

  useEffect(() => {
    load();
  }, [load]);

  const change = async (lead: Lead, data: { status?: LeadStatus; staffNote?: string }) => {
    try {
      const updated = await updateLead(lead.id, data);
      setLeads((list) => list.map((l) => (l.id === lead.id ? { ...l, ...updated } : l)));
      message.success("Đã cập nhật");
    } catch (e) {
      message.error(e instanceof ApiError ? e.message : "Cập nhật thất bại");
    }
  };

  const today = dayjs().format("YYYY-MM-DD");
  const todayCount = leads.filter((l) => l.callbackDate && dayjs(l.callbackDate).format("YYYY-MM-DD") === today).length;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <PageHeader
        title="Lịch gọi lại & Yêu cầu tư vấn"
        description={<>Khách gửi từ Mini App reMini. SĐT có dấu <LuBadgeCheck className="inline text-green-600" /> là số Zalo đã xác minh.</>}
      />
      <FilterBar
        filters={<><Segmented
            value={tab}
            onChange={(v) => setTab(v as typeof tab)}
            options={[
              { value: "callback", label: "Đặt lịch gọi lại" },
              { value: "consultation", label: "Nhận tư vấn" },
            ]}
          />
<FilterSelect
            value={status}
            onChange={setStatus}
            options={[{ value: "", label: "Mọi trạng thái" }, ...Object.entries(STATUS).map(([v, s]) => ({ value: v, label: s.label }))]}
          /></>}
        actions={<><Button
            icon={<LuDownload size={14} />}
            disabled={!leads.length}
            onClick={() =>
              downloadCsv(`${tab === "callback" ? "lich-goi-lai" : "tu-van"}-${dayjs().format("YYYYMMDD-HHmm")}.csv`, [
                ["Gửi lúc", "Họ tên", "SĐT", "SĐT đã xác minh Zalo", "Ngành", "Mẫu", "Ghi chú khách", "Ngày hẹn", "Khung giờ", "Trạng thái", "Ghi chú cuộc gọi"],
                ...leads.map((l) => [
                  dayjs(l.createdAt).format("DD/MM/YYYY HH:mm"),
                  l.name,
                  l.phone,
                  l.phoneVerified ? "Có" : "Không",
                  l.industry,
                  l.templateId,
                  l.note,
                  l.callbackDate ? dayjs(l.callbackDate).format("DD/MM/YYYY") : "",
                  l.callbackSlot,
                  STATUS[l.status].label,
                  l.staffNote,
                ]),
              ])
            }
          >
            Xuất CSV
          </Button>
<Button icon={<LuRefreshCw size={14} />} onClick={load} loading={loading} /></>}
      />

      {tab === "callback" && !error && (
        <div className="mb-3 rounded-xl bg-orange-50 px-3 py-2 text-xs text-orange-800">
          Hôm nay có <b>{todayCount}</b> cuộc gọi đã hẹn · tổng {leads.length} lịch {status ? `"${STATUS[status].label}"` : ""}
        </div>
      )}

      {error ? (
        <ErrorBox error={error} onRetry={load} />
      ) : (
        <Table<Lead>
          rowKey="id"
          size="small"
          loading={loading}
          dataSource={leads}
          pagination={{ pageSize: 12 }}
          locale={{ emptyText: <Empty description="Chưa có yêu cầu nào" /> }}
          columns={[
            ...(tab === "callback"
              ? [
                  {
                    title: "Hẹn gọi",
                    width: 130,
                    render: (_: unknown, r: Lead) => {
                      const d = r.callbackDate ? dayjs(r.callbackDate) : null;
                      const isToday = d?.format("YYYY-MM-DD") === today;
                      const overdue = d && d.isBefore(dayjs(), "day") && r.status === "NEW";
                      return (
                        <div>
                          <div className={`text-xs font-bold ${overdue ? "text-red-600" : isToday ? "text-orange-600" : "text-slate-900"}`}>
                            {d ? (isToday ? "Hôm nay" : d.format("ddd DD/MM")) : "—"}
                          </div>
                          <div className="font-mono text-xs text-slate-500">{r.callbackSlot}</div>
                          {overdue && <Tag color="red" className="mt-0.5 text-xs">Quá hạn</Tag>}
                        </div>
                      );
                    },
                  },
                ]
              : []),
            {
              title: "Khách",
              render: (_, r) => (
                <div>
                  <div className="text-sm font-semibold text-slate-900">{r.name}</div>
                  <a href={`tel:${r.phone}`} className="inline-flex items-center gap-1 font-mono text-xs text-brand-600">
                    <LuPhone size={12} /> {r.phone}
                    {r.phoneVerified && (
                      <Tooltip title="Số điện thoại Zalo đã xác minh">
                        <LuBadgeCheck className="text-green-600" />
                      </Tooltip>
                    )}
                  </a>
                  {r.user && <div className="text-xs text-slate-400">Đăng nhập Zalo · {r.user.name}</div>}
                </div>
              ),
            },
            {
              title: "Nhu cầu",
              render: (_, r) => (
                <div className="max-w-[260px] text-xs text-slate-600">
                  {r.industry && <Tag className="text-xs">{r.industry}</Tag>}
                  {r.templateId && <Tag color="blue" className="text-xs">{r.templateId}</Tag>}
                  <div className="mt-0.5 line-clamp-2">{r.note || <span className="text-slate-300">—</span>}</div>
                  <div className="text-xs text-slate-400">Gửi {dayjs(r.createdAt).format("HH:mm DD/MM")}</div>
                </div>
              ),
            },
            {
              title: "Trạng thái",
              width: 150,
              render: (_, r) => (
                <Select
                  size="small"
                  value={r.status}
                  style={{ width: 140 }}
                  onChange={(v) => change(r, { status: v })}
                  options={Object.entries(STATUS).map(([v, s]) => ({ value: v, label: <Tag color={s.color}>{s.label}</Tag> }))}
                />
              ),
            },
            {
              title: "Ghi chú cuộc gọi",
              width: 240,
              render: (_, r) => (
                <Input.TextArea
                  size="small"
                  autoSize={{ minRows: 1, maxRows: 3 }}
                  placeholder="VD: hẹn gửi báo giá thứ 6"
                  value={noteDraft[r.id] ?? r.staffNote ?? ""}
                  onChange={(e) => setNoteDraft((d) => ({ ...d, [r.id]: e.target.value }))}
                  onBlur={() => {
                    const v = noteDraft[r.id];
                    if (v !== undefined && v !== (r.staffNote ?? "")) change(r, { staffNote: v });
                  }}
                />
              ),
            },
          ]}
        />
      )}
    </div>
  );
}

// ═════════════════════════════ Kênh kết nối API ═════════════════════════════

const CHANNELS: { value: Channel; label: string; hint: string }[] = [
  { value: "zalo_mini_app", label: "Zalo Mini App", hint: "Public client · đăng nhập Zalo + refresh token, không có secret" },
  { value: "web", label: "Website", hint: "client_credentials + refresh token" },
  { value: "pos", label: "Máy POS / phần mềm bán hàng", hint: "client_credentials" },
  { value: "api", label: "Tích hợp API khác", hint: "client_credentials" },
  { value: "webhook", label: "Webhook", hint: "client_credentials" },
];
const channelLabel = (c: string) => CHANNELS.find((x) => x.value === c)?.label ?? c;

function Copyable({ value, secret }: { value: string; secret?: boolean }) {
  const { message } = AntApp.useApp();
  return (
    <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5 ring-1 ring-slate-200">
      <code className={`min-w-0 flex-1 truncate text-xs ${secret ? "text-red-700" : "text-slate-800"}`}>{value}</code>
      <button
        type="button"
        onClick={() => navigator.clipboard.writeText(value).then(() => message.success("Đã sao chép"))}
        className="text-slate-500 hover:text-slate-900"
      >
        <LuCopy size={14} />
      </button>
    </div>
  );
}

/** Mỗi kênh của khách có client_id + client_secret riêng (như Application của django-oauth-toolkit). */
export function ApiChannelsSection() {
  const { message } = AntApp.useApp();
  const [apps, setApps] = useState<OAuthApp[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [draft, setDraft] = useState<{ name: string; channel: Channel; scopes: string[] }>({ name: "", channel: "web", scopes: [] });
  const [revealed, setRevealed] = useState<OAuthApp | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setApps(await fetchOAuthApps());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Lỗi không xác định");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      message.success(ok);
      load();
    } catch (e) {
      message.error(e instanceof ApiError ? e.message : "Thao tác thất bại");
    }
  };

  const create = async () => {
    if (!draft.name.trim()) return message.warning("Nhập tên kênh");
    try {
      const app = await createOAuthApp({ ...draft, name: draft.name.trim() });
      setCreateOpen(false);
      setDraft({ name: "", channel: "web", scopes: [] });
      setRevealed(app);
      load();
    } catch (e) {
      message.error(e instanceof ApiError ? e.message : "Tạo kênh thất bại");
    }
  };

  const tokenUrl = `${siteConfig.apiUrl}/oauth/token`;
  const curl = useMemo(
    () =>
      revealed?.clientSecret
        ? `curl -X POST ${tokenUrl} \\\n  -u "${revealed.clientId}:${revealed.clientSecret}" \\\n  -d grant_type=client_credentials`
        : "",
    [revealed, tokenUrl],
  );

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <PageHeader
        title="Kênh kết nối API (OAuth 2.0)"
        description={<>Mỗi kênh (Mini App, website, POS…) có <b>Client ID</b> và <b>Client Secret</b> riêng để lấy access token tại{" "}
            <code>/oauth/token</code>. Secret chỉ hiện 1 lần khi tạo.</>}
        actions={<><Button icon={<LuRefreshCw size={14} />} onClick={load} loading={loading} />
          <Button type="primary" icon={<LuPlus size={15} />} onClick={() => setCreateOpen(true)}>
            Tạo kênh
          </Button></>}
      />

      {error ? (
        <ErrorBox error={error} onRetry={load} />
      ) : (
        <Table<OAuthApp>
          rowKey="id"
          size="small"
          loading={loading}
          dataSource={apps}
          pagination={false}
          locale={{ emptyText: <Empty description="Chưa có kênh nào" /> }}
          columns={[
            {
              title: "Kênh",
              render: (_, r) => (
                <div>
                  <div className="text-sm font-semibold text-slate-900">{r.name}</div>
                  <div className="text-xs text-slate-500">
                    {channelLabel(r.channel)} · {r.clientType === "public" ? "Public" : "Confidential"}
                    {r.customer && ` · ${r.customer.companyName || r.customer.name}`}
                  </div>
                </div>
              ),
            },
            {
              title: "Client ID",
              width: 260,
              render: (_, r) => (
                <div className="space-y-1">
                  <Copyable value={r.clientId} />
                  <div className="text-xs text-slate-400">
                    Secret: {r.secretHint ? `••••${r.secretHint}` : "không có (public)"}
                  </div>
                </div>
              ),
            },
            {
              title: "Quyền",
              render: (_, r) => (
                <div className="flex max-w-[220px] flex-wrap gap-1">
                  {r.grantTypes.map((g) => (
                    <Tag key={g} className="text-xs">
                      {g}
                    </Tag>
                  ))}
                  {r.scopes.map((s) => (
                    <Tag key={s} color="blue" className="text-xs">
                      {s}
                    </Tag>
                  ))}
                </div>
              ),
            },
            {
              title: "Sử dụng",
              width: 130,
              render: (_, r) => (
                <div className="text-xs text-slate-500">
                  <div>{r.activeTokens ?? 0} token còn hạn</div>
                  <div>{r.lastUsedAt ? `Dùng ${dayjs(r.lastUsedAt).format("HH:mm DD/MM")}` : "Chưa dùng"}</div>
                </div>
              ),
            },
            {
              title: "Bật",
              width: 60,
              render: (_, r) => (
                <Switch
                  size="small"
                  checked={r.active}
                  onChange={(v) => run(() => updateOAuthApp(r.id, { active: v }), v ? "Đã bật kênh" : "Đã tắt kênh & thu hồi token")}
                />
              ),
            },
            {
              title: "",
              width: 120,
              render: (_, r) => (
                <div className="flex gap-1">
                  {r.clientType === "confidential" && (
                    <Popconfirm
                      title="Tạo secret mới?"
                      description="Secret cũ hết hiệu lực ngay, cần cập nhật ở nơi đang dùng."
                      onConfirm={async () => {
                        try {
                          setRevealed(await rotateOAuthSecret(r.id));
                          load();
                        } catch (e) {
                          message.error(e instanceof ApiError ? e.message : "Thất bại");
                        }
                      }}
                    >
                      <Tooltip title="Đổi secret">
                        <Button size="small" icon={<LuKeyRound size={13} />} />
                      </Tooltip>
                    </Popconfirm>
                  )}
                  <Popconfirm title="Đăng xuất mọi phiên của kênh này?" onConfirm={() => run(() => revokeOAuthTokens(r.id), "Đã thu hồi mọi token")}>
                    <Tooltip title="Thu hồi token">
                      <Button size="small" icon={<LuRotateCcw size={13} />} />
                    </Tooltip>
                  </Popconfirm>
                  <Popconfirm title="Xoá kênh?" onConfirm={() => run(() => deleteOAuthApp(r.id), "Đã xoá kênh")}>
                    <Button size="small" danger icon={<LuTrash2 size={13} />} />
                  </Popconfirm>
                </div>
              ),
            },
          ]}
        />
      )}

      <Modal title="Tạo kênh kết nối" open={createOpen} onCancel={() => setCreateOpen(false)} onOk={create} okText="Tạo" destroyOnHidden>
        <div className="space-y-3 pt-2">
          <div>
            <div className="mb-1 text-xs font-semibold text-slate-600">Tên kênh</div>
            <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="VD: Website LUMI Studio" />
          </div>
          <div>
            <div className="mb-1 text-xs font-semibold text-slate-600">Loại kênh</div>
            <Select
              className="w-full"
              value={draft.channel}
              onChange={(v) => setDraft({ ...draft, channel: v })}
              options={CHANNELS.map((c) => ({ value: c.value, label: `${c.label} — ${c.hint}` }))}
            />
          </div>
          <div>
            <div className="mb-1 text-xs font-semibold text-slate-600">Scope (không bắt buộc)</div>
            <Select
              mode="tags"
              className="w-full"
              value={draft.scopes}
              onChange={(v) => setDraft({ ...draft, scopes: v })}
              placeholder="stores:read, orders:write…"
              options={["profile", "stores:read", "stores:write", "orders:write", "leads:write"].map((s) => ({ value: s, label: s }))}
            />
          </div>
        </div>
      </Modal>

      <Modal
        title="Lưu thông tin kênh ngay"
        open={!!revealed}
        onCancel={() => setRevealed(null)}
        footer={<Button type="primary" onClick={() => setRevealed(null)}>Tôi đã lưu</Button>}
      >
        {revealed && (
          <div className="space-y-3 pt-1">
            {revealed.clientSecret ? (
              <Alert type="warning" showIcon title="Client Secret chỉ hiển thị 1 lần" description="Đóng cửa sổ này là không xem lại được — chỉ có thể tạo secret mới." />
            ) : (
              <Alert type="info" showIcon title="Public client" description="Kênh Mini App không có secret; dùng client_id + grant zalo_mini_app." />
            )}
            <div>
              <div className="mb-1 text-xs font-semibold text-slate-600">Client ID</div>
              <Copyable value={revealed.clientId} />
            </div>
            {revealed.clientSecret && (
              <>
                <div>
                  <div className="mb-1 text-xs font-semibold text-slate-600">Client Secret</div>
                  <Copyable value={revealed.clientSecret} secret />
                </div>
                <div>
                  <div className="mb-1 text-xs font-semibold text-slate-600">Lấy access token</div>
                  <pre className="overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">{curl}</pre>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
