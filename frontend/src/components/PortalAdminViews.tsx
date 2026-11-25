import { Alert, App as AntApp, Button, Drawer, Empty, Input, InputNumber, Modal, Popconfirm, Segmented, Select, Table, Tag, Tooltip } from "antd";
import dayjs from "dayjs";
import { useCallback, useEffect, useState } from "react";
import { LuBan, LuCheck, LuPlus, LuRefreshCw, LuSend, LuShieldAlert, LuTrash2 } from "react-icons/lu";
import {
  addMilestone,
  addSpamBlock,
  ApiError,
  createPlatformCustomer,
  createProject,
  deleteMilestone,
  deleteProject,
  fetchPlatformCustomers,
  fetchProjects,
  fetchSpamBlocks,
  fetchSpamEvents,
  fetchSpamLeads,
  fetchSpamStats,
  fetchTicketFull,
  fetchTickets,
  Lead,
  markLeadSpam,
  PlatformCustomerLite,
  Project,
  removeSpamBlock,
  SpamBlock,
  SpamEvent,
  staffReply,
  TicketFull,
  TicketRow,
  updateMilestone,
  updateProject,
  updateTicket,
} from "../data/platform-api";
import { storesForCustomer } from "../data/store-filter";
import { fetchStores } from "../data/store-api";
import { demoTemplates } from "../data/site";
import { FilterBar, FilterSelect, PageHeader } from "./ui";

const errMsg = (e: unknown, fallback = "Thao tác thất bại") => (e instanceof ApiError ? e.message : fallback);

function useLoader<T>(fn: () => Promise<T>, deps: unknown[] = []) {
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
  return { data, setData, loading, error, load };
}

function LoadError({ error, onRetry }: { error: string; onRetry: () => void }) {
  return <Alert type="warning" showIcon title="Không tải được dữ liệu" description={error} action={<Button size="small" onClick={onRetry}>Thử lại</Button>} />;
}

// ═════════════════════════════ Dự án & Ticket ═════════════════════════════

export const PROJECT_STATUS: Record<string, { label: string; color: string }> = {
  consulting: { label: "Tư vấn", color: "default" },
  designing: { label: "Thiết kế", color: "purple" },
  developing: { label: "Lập trình", color: "blue" },
  testing: { label: "Kiểm thử", color: "cyan" },
  zalo_review: { label: "Chờ Zalo duyệt", color: "gold" },
  live: { label: "Đang hoạt động", color: "green" },
  maintenance: { label: "Bảo trì", color: "geekblue" },
  paused: { label: "Tạm dừng", color: "default" },
};

const TICKET_STATUS: Record<string, { label: string; color: string }> = {
  open: { label: "Chờ xử lý", color: "orange" },
  in_progress: { label: "Đang xử lý", color: "blue" },
  waiting_customer: { label: "Chờ khách", color: "magenta" },
  resolved: { label: "Đã giải quyết", color: "green" },
  closed: { label: "Đã đóng", color: "default" },
};

const DEFAULT_MILESTONES = ["Chốt yêu cầu & báo giá", "Thiết kế giao diện", "Lập trình & nhập dữ liệu", "Kiểm thử cùng khách", "Gửi Zalo duyệt", "Bàn giao & hướng dẫn"];

/** Dự án triển khai của khách + ticket hỗ trợ — khách xem được trong tab "Tài khoản" của Mini App reMini. */
export function PortalSection() {
  const [tab, setTab] = useState<"projects" | "tickets">("projects");
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <PageHeader
        title="Dự án & Ticket khách hàng"
        description={<>Khách đăng nhập Zalo trong Mini App reMini (số Zalo trùng SĐT khách hàng) sẽ thấy tiến độ và ticket ở tab "Tài khoản".</>}
      />
      <FilterBar
        filters={<><Segmented
          value={tab}
          onChange={(v) => setTab(v as typeof tab)}
          options={[
            { value: "projects", label: "Tiến độ dự án" },
            { value: "tickets", label: "Ticket hỗ trợ" },
          ]}
        /></>}
      />
      {tab === "projects" ? <ProjectsPanel /> : <TicketsPanel />}
    </div>
  );
}

function ProjectsPanel() {
  const { message } = AntApp.useApp();
  const projects = useLoader(fetchProjects);
  const customers = useLoader(fetchPlatformCustomers);
  const stores = useLoader(fetchStores);
  // Chỉ gán được store của đúng khách của dự án (lệch → server trả 400)
  const storeOptionsFor = (customerId?: string) =>
    storesForCustomer(stores.data ?? [], customerId).map((s) => ({ value: s.id, label: `${s.name} · ${s.slug}` }));
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ customerId: "", name: "", templateId: "", storeId: "", startDate: "", dueDate: "", newCustomerName: "", newCustomerPhone: "" });
  const [newMs, setNewMs] = useState<Record<string, string>>({});

  const replace = (p: Project) => projects.setData((list) => (list ?? []).map((x) => (x.id === p.id ? { ...x, ...p } : x)));

  const save = async () => {
    try {
      let customerId = draft.customerId;
      if (customerId === "__new") {
        if (!draft.newCustomerName.trim() || !/^0\d{9}$/.test(draft.newCustomerPhone.trim())) {
          return message.warning("Nhập tên và SĐT (số Zalo) của khách hàng mới");
        }
        customerId = (await createPlatformCustomer({ name: draft.newCustomerName.trim(), phone: draft.newCustomerPhone.trim() })).id;
        customers.load();
      }
      if (!customerId || !draft.name.trim()) return message.warning("Chọn khách hàng và nhập tên dự án");
      await createProject({
        customerId,
        name: draft.name.trim(),
        templateId: draft.templateId || undefined,
        storeId: draft.storeId || undefined,
        startDate: draft.startDate || undefined,
        dueDate: draft.dueDate || undefined,
        milestones: DEFAULT_MILESTONES,
      });
      message.success("Đã tạo dự án");
      setOpen(false);
      setDraft({ customerId: "", name: "", templateId: "", storeId: "", startDate: "", dueDate: "", newCustomerName: "", newCustomerPhone: "" });
      projects.load();
    } catch (e) {
      message.error(errMsg(e));
    }
  };

  const patch = async (p: Project, data: Parameters<typeof updateProject>[1]) => {
    try {
      replace(await updateProject(p.id, data));
    } catch (e) {
      message.error(errMsg(e));
    }
  };

  const msAction = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      projects.load();
    } catch (e) {
      message.error(errMsg(e));
    }
  };

  if (projects.error) return <LoadError error={projects.error} onRetry={projects.load} />;

  return (
    <>
      <div className="mb-3 flex justify-end gap-2">
        <Button icon={<LuRefreshCw size={14} />} onClick={projects.load} loading={projects.loading} />
        <Button type="primary" icon={<LuPlus size={15} />} onClick={() => setOpen(true)}>
          Tạo dự án
        </Button>
      </div>

      {(projects.data ?? []).length === 0 && !projects.loading ? (
        <Empty description="Chưa có dự án" />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {(projects.data ?? []).map((p) => (
            <div key={p.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold text-slate-900">{p.name}</div>
                  <div className="text-xs text-slate-500">
                    {p.customer?.companyName || p.customer?.name} · {p.customer?.phone}
                    {p.templateId && ` · ${p.templateId}`}
                  </div>
                </div>
                <Popconfirm title="Xoá dự án?" onConfirm={() => msAction(() => deleteProject(p.id))}>
                  <Button size="small" type="text" danger icon={<LuTrash2 size={13} />} />
                </Popconfirm>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Select
                  size="small"
                  value={p.status}
                  style={{ width: 150 }}
                  onChange={(v) => patch(p, { status: v })}
                  options={Object.entries(PROJECT_STATUS).map(([v, s]) => ({ value: v, label: <Tag color={s.color}>{s.label}</Tag> }))}
                />
                <Tooltip title="Tự tính theo mốc công việc; sửa tay nếu dự án không có mốc">
                  <InputNumber size="small" min={0} max={100} value={p.progress} suffix="%" style={{ width: 90 }} onChange={(v) => v !== null && patch(p, { progress: Number(v) })} />
                </Tooltip>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                <label className="flex items-center gap-1">
                  Bắt đầu
                  <input
                    type="date"
                    className="rounded border border-slate-200 px-1 py-0.5 text-xs"
                    value={p.startDate ? dayjs(p.startDate).format("YYYY-MM-DD") : ""}
                    onChange={(e) => patch(p, { startDate: e.target.value || null })}
                  />
                </label>
                <label className="flex items-center gap-1">
                  Hạn
                  <input
                    type="date"
                    className="rounded border border-slate-200 px-1 py-0.5 text-xs"
                    value={p.dueDate ? dayjs(p.dueDate).format("YYYY-MM-DD") : ""}
                    onChange={(e) => patch(p, { dueDate: e.target.value || null })}
                  />
                </label>
              </div>
              <Select
                size="small"
                showSearch
                allowClear
                optionFilterProp="label"
                className="mt-2 w-full"
                placeholder="Gán gian hàng (Mini App của khách)"
                value={p.storeId || undefined}
                loading={stores.loading}
                onChange={(v) => patch(p, { storeId: v ?? null })}
                options={storeOptionsFor(p.customerId)}
              />
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-blue-600" style={{ width: `${p.progress}%` }} />
              </div>

              <div className="mt-3 space-y-1">
                {p.milestones.map((m) => (
                  <div key={m.id} className="group flex items-center gap-2 text-xs">
                    <Select
                      size="small"
                      variant="borderless"
                      value={m.status}
                      style={{ width: 112 }}
                      onChange={(v) => msAction(() => updateMilestone(m.id, { status: v }))}
                      options={[
                        { value: "todo", label: "○ Chưa làm" },
                        { value: "doing", label: "◐ Đang làm" },
                        { value: "done", label: "● Xong" },
                      ]}
                    />
                    <span className={`flex-1 ${m.status === "done" ? "text-slate-400 line-through" : "text-slate-700"}`}>{m.title}</span>
                    <button className="hidden text-slate-400 hover:text-red-600 group-hover:block" onClick={() => msAction(() => deleteMilestone(m.id))}>
                      <LuTrash2 size={12} />
                    </button>
                  </div>
                ))}
                <Input
                  size="small"
                  placeholder="+ Thêm mốc công việc (Enter)"
                  value={newMs[p.id] ?? ""}
                  onChange={(e) => setNewMs((d) => ({ ...d, [p.id]: e.target.value }))}
                  onPressEnter={() => {
                    const t = (newMs[p.id] ?? "").trim();
                    if (!t) return;
                    setNewMs((d) => ({ ...d, [p.id]: "" }));
                    msAction(() => addMilestone(p.id, t));
                  }}
                />
              </div>

              <Input.TextArea
                className="mt-2"
                size="small"
                autoSize={{ minRows: 1, maxRows: 3 }}
                placeholder="Ghi chú hiển thị cho khách (VD: Đã gửi Zalo duyệt, dự kiến 2 ngày)"
                defaultValue={p.note ?? ""}
                onBlur={(e) => e.target.value !== (p.note ?? "") && patch(p, { note: e.target.value })}
              />
            </div>
          ))}
        </div>
      )}

      <Modal title="Tạo dự án" open={open} onCancel={() => setOpen(false)} onOk={save} okText="Tạo" destroyOnHidden>
        <div className="space-y-3 pt-2">
          <Select
            className="w-full"
            showSearch
            optionFilterProp="label"
            placeholder="Khách hàng"
            value={draft.customerId || undefined}
            onChange={(v) => setDraft({ ...draft, customerId: v })}
            options={[
              { value: "__new", label: "+ Khách hàng mới" },
              ...((customers.data ?? []) as PlatformCustomerLite[]).map((c) => ({ value: c.id, label: `${c.companyName || c.name} · ${c.phone}` })),
            ]}
          />
          {draft.customerId === "__new" && (
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Tên khách hàng" value={draft.newCustomerName} onChange={(e) => setDraft({ ...draft, newCustomerName: e.target.value })} />
              <Input placeholder="SĐT Zalo của khách" value={draft.newCustomerPhone} onChange={(e) => setDraft({ ...draft, newCustomerPhone: e.target.value })} />
            </div>
          )}
          <Input placeholder="Tên dự án, VD: Mini App LUMI Studio" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          <Select
            className="w-full"
            allowClear
            placeholder="Mẫu sử dụng (không bắt buộc)"
            value={draft.templateId || undefined}
            onChange={(v) => setDraft({ ...draft, templateId: v ?? "" })}
            options={demoTemplates.map((t) => ({ value: t.id, label: `${t.code} · ${t.name}` }))}
          />
          <Select
            className="w-full"
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="Gán gian hàng (không bắt buộc)"
            value={draft.storeId || undefined}
            onChange={(v) => setDraft({ ...draft, storeId: v ?? "" })}
            options={storeOptionsFor(draft.customerId && draft.customerId !== "__new" ? draft.customerId : undefined)}
          />
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-slate-500">
              Ngày bắt đầu
              <Input type="date" value={draft.startDate} onChange={(e) => setDraft({ ...draft, startDate: e.target.value })} />
            </label>
            <label className="text-xs text-slate-500">
              Hạn hoàn thành
              <Input type="date" value={draft.dueDate} onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })} />
            </label>
          </div>
          <div className="text-xs text-slate-500">Tự tạo {DEFAULT_MILESTONES.length} mốc mặc định: {DEFAULT_MILESTONES.join(" → ")}</div>
        </div>
      </Modal>
    </>
  );
}

function TicketsPanel() {
  const { message } = AntApp.useApp();
  const [status, setStatus] = useState("");
  const tickets = useLoader(() => fetchTickets(status || undefined), [status]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [ticket, setTicket] = useState<TicketFull | null>(null);
  const [reply, setReply] = useState("");
  const [replyStatus, setReplyStatus] = useState("waiting_customer");

  useEffect(() => {
    setTicket(null);
    setReply("");
    if (openId) fetchTicketFull(openId).then(setTicket).catch((e) => message.error(errMsg(e)));
  }, [openId]);

  const send = async () => {
    if (!ticket || !reply.trim()) return;
    try {
      setTicket(await staffReply(ticket.id, reply.trim(), replyStatus));
      setReply("");
      tickets.load();
    } catch (e) {
      message.error(errMsg(e));
    }
  };

  if (tickets.error) return <LoadError error={tickets.error} onRetry={tickets.load} />;

  return (
    <>
      <FilterBar
        filters={
          <FilterSelect
            value={status}
            onChange={setStatus}
            options={[{ value: "", label: "Chưa đóng" }, ...Object.entries(TICKET_STATUS).map(([v, s]) => ({ value: v, label: s.label }))]}
          />
        }
        actions={<Button icon={<LuRefreshCw size={14} />} onClick={tickets.load} loading={tickets.loading} />}
      />
      <Table<TicketRow>
        rowKey="id"
        size="small"
        loading={tickets.loading}
        dataSource={tickets.data ?? []}
        pagination={{ pageSize: 12 }}
        onRow={(r) => ({ onClick: () => setOpenId(r.id), className: "cursor-pointer" })}
        locale={{ emptyText: <Empty description="Không có ticket" /> }}
        columns={[
          { title: "Mã", dataIndex: "code", width: 110, render: (v) => <span className="font-mono text-xs font-bold">{v}</span> },
          {
            title: "Tiêu đề",
            render: (_, r) => (
              <div>
                <div className="text-sm font-semibold text-slate-900">{r.subject}</div>
                <div className="line-clamp-1 text-xs text-slate-500">
                  {r.messages[0]?.authorType === "customer" ? "Khách: " : "Mình: "}
                  {r.messages[0]?.body}
                </div>
              </div>
            ),
          },
          { title: "Khách", render: (_, r) => <span className="text-xs">{r.customer?.companyName || r.customer?.name}</span> },
          {
            title: "Ưu tiên",
            width: 90,
            render: (_, r) => <Tag color={r.priority === "urgent" ? "red" : r.priority === "high" ? "orange" : "default"}>{r.priority}</Tag>,
          },
          { title: "Trạng thái", width: 130, render: (_, r) => <Tag color={TICKET_STATUS[r.status]?.color}>{TICKET_STATUS[r.status]?.label ?? r.status}</Tag> },
          { title: "Cập nhật", width: 110, render: (_, r) => <span className="text-xs text-slate-500">{dayjs(r.lastReplyAt).format("HH:mm DD/MM")}</span> },
        ]}
      />

      <Drawer open={!!openId} onClose={() => setOpenId(null)} size={520} title={ticket ? `${ticket.code} · ${ticket.subject}` : "Ticket"}>
        {ticket && (
          <div className="flex h-full flex-col">
            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>{ticket.customer?.companyName || ticket.customer?.name} · {ticket.customer?.phone}</span>
              {ticket.project && <Tag>{ticket.project.name}</Tag>}
              <Select
                size="small"
                value={ticket.status}
                style={{ width: 150 }}
                onChange={async (v) => {
                  await updateTicket(ticket.id, { status: v }).catch((e) => message.error(errMsg(e)));
                  setTicket({ ...ticket, status: v });
                  tickets.load();
                }}
                options={Object.entries(TICKET_STATUS).map(([v, s]) => ({ value: v, label: s.label }))}
              />
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto">
              {ticket.messages.map((m) => (
                <div key={m.id} className={`flex ${m.authorType === "staff" ? "justify-end" : m.authorType === "system" ? "justify-center" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                      m.authorType === "staff" ? "bg-blue-600 text-white" : m.authorType === "system" ? "text-xs text-slate-400" : "bg-slate-100 text-slate-800"
                    }`}
                  >
                    {m.authorType !== "system" && <div className="text-xs font-semibold opacity-80">{m.authorName}</div>}
                    <div className="whitespace-pre-wrap">{m.body}</div>
                    <div className="mt-0.5 text-xs opacity-70">{dayjs(m.createdAt).format("HH:mm DD/MM")}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
              <Input.TextArea autoSize={{ minRows: 2, maxRows: 6 }} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Trả lời khách…" />
              <div className="flex items-center justify-between gap-2">
                <Select
                  size="small"
                  value={replyStatus}
                  onChange={setReplyStatus}
                  style={{ width: 210 }}
                  options={[
                    { value: "waiting_customer", label: "Sau khi gửi: Chờ khách" },
                    { value: "in_progress", label: "Sau khi gửi: Đang xử lý" },
                    { value: "resolved", label: "Sau khi gửi: Đã giải quyết" },
                  ]}
                />
                <Button type="primary" icon={<LuSend size={14} />} onClick={send} disabled={!reply.trim()}>
                  Gửi
                </Button>
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </>
  );
}

// ═════════════════════════════ Chống spam ═════════════════════════════

const REASON_LABEL: Record<string, string> = {
  honeypot: "Dính ô bẫy",
  no_form_token: "Không mở form",
  bad_form_token: "Token giả",
  too_fast: "Gửi quá nhanh",
  form_expired: "Form quá cũ",
  token_reused: "Dùng lại token",
  phone_prefix: "Đầu số lạ",
  phone_pattern: "SĐT dãy số",
  url_in_name: "Link trong tên",
  numeric_name: "Tên toàn số",
  long_name: "Tên quá dài",
  many_links: "Nhiều link",
  link: "Có link",
  gibberish: "Ký tự rác",
  zalo_verified: "Zalo xác minh (−40)",
  blocked_ip: "IP bị chặn",
  blocked_phone: "SĐT bị chặn",
  blocked_user: "Tài khoản bị chặn",
};
const reasonLabel = (r: string) =>
  REASON_LABEL[r] ?? (r.startsWith("keyword:") ? `Từ khoá "${r.slice(8)}"` : r.startsWith("phone_24h:") ? `${r.slice(10)} lần/24h` : r);

export function AntiSpamSection() {
  const { message } = AntApp.useApp();
  const [tab, setTab] = useState<"events" | "leads" | "blocks">("events");
  const stats = useLoader(fetchSpamStats);
  const events = useLoader(() => fetchSpamEvents(), []);
  const blocks = useLoader(fetchSpamBlocks);
  const leads = useLoader(fetchSpamLeads);
  const [draft, setDraft] = useState({ kind: "ip", value: "", reason: "", hours: 0 });

  const block = async (kind: string, value: string, reason: string, hours?: number) => {
    try {
      await addSpamBlock({ kind, value, reason, hours: hours || undefined });
      message.success(`Đã chặn ${value}`);
      blocks.load();
      stats.load();
    } catch (e) {
      message.error(errMsg(e));
    }
  };

  const err = events.error || blocks.error || stats.error;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <PageHeader
        title={<><LuShieldAlert size={18} /> Chống spam</>}
        description={<>Ô bẫy · token mở form (≥ 2,5 giây) · đầu số VN · lọc link & từ khoá · tần suất theo IP/SĐT · tự chặn IP 24h khi bị chặn ≥ 5 lần/giờ.</>}
        actions={<>{stats.data && (
          <div className="flex gap-2 text-center text-xs">
            <div className="rounded-lg bg-red-50 px-3 py-1.5 text-red-700">
              <div className="text-base font-bold">{stats.data.last7Days.blocked}</div>đã chặn 7 ngày
            </div>
            <div className="rounded-lg bg-amber-50 px-3 py-1.5 text-amber-700">
              <div className="text-base font-bold">{stats.data.last7Days.flagged}</div>nghi ngờ
            </div>
            <div className="rounded-lg bg-slate-100 px-3 py-1.5 text-slate-700">
              <div className="text-base font-bold">{stats.data.activeBlocks}</div>danh sách chặn
            </div>
          </div>
        )}</>}
      />

      {err ? (
        <LoadError error={err} onRetry={() => [events.load(), blocks.load(), stats.load()]} />
      ) : (
        <>
          <Segmented
            className="mb-3"
            value={tab}
            onChange={(v) => setTab(v as typeof tab)}
            options={[
              { value: "events", label: "Nhật ký" },
              { value: "leads", label: `Yêu cầu nghi spam (${leads.data?.length ?? 0})` },
              { value: "blocks", label: "Danh sách chặn" },
            ]}
          />

          {tab === "events" && (
            <Table<SpamEvent>
              rowKey="id"
              size="small"
              loading={events.loading}
              dataSource={events.data ?? []}
              pagination={{ pageSize: 15 }}
              columns={[
                { title: "Lúc", width: 100, render: (_, r) => <span className="text-xs">{dayjs(r.createdAt).format("HH:mm DD/MM")}</span> },
                { title: "Kết quả", width: 90, render: (_, r) => <Tag color={r.action === "blocked" ? "red" : "gold"}>{r.action === "blocked" ? "Chặn" : "Nghi ngờ"} {r.score}</Tag> },
                { title: "Lý do", render: (_, r) => <div className="flex flex-wrap gap-1">{r.reasons.map((x) => <Tag key={x} className="text-xs">{reasonLabel(x)}</Tag>)}</div> },
                { title: "Nguồn", render: (_, r) => <div className="text-xs text-slate-500"><div>{r.route}</div><div className="font-mono">{r.ip} {r.phone}</div></div> },
                { title: "Nội dung", render: (_, r) => <span className="line-clamp-2 text-xs text-slate-500">{r.sample}</span> },
                {
                  title: "",
                  width: 90,
                  render: (_, r) => (
                    <div className="flex gap-1">
                      {r.ip && (
                        <Tooltip title={`Chặn IP ${r.ip} 7 ngày`}>
                          <Button size="small" icon={<LuBan size={12} />} onClick={() => block("ip", r.ip!, `Từ nhật ký: ${r.reasons.join(", ")}`, 24 * 7)} />
                        </Tooltip>
                      )}
                      {r.phone && (
                        <Tooltip title={`Chặn SĐT ${r.phone}`}>
                          <Button size="small" danger icon={<LuBan size={12} />} onClick={() => block("phone", r.phone!, "Từ nhật ký spam")} />
                        </Tooltip>
                      )}
                    </div>
                  ),
                },
              ]}
            />
          )}

          {tab === "leads" && (
            <Table<Lead>
              rowKey="id"
              size="small"
              loading={leads.loading}
              dataSource={leads.data ?? []}
              pagination={{ pageSize: 15 }}
              locale={{ emptyText: <Empty description="Không có yêu cầu nghi spam" /> }}
              columns={[
                { title: "Khách", render: (_, r) => <div><div className="text-sm font-semibold">{r.name}</div><div className="font-mono text-xs">{r.phone}</div></div> },
                { title: "Ghi chú", render: (_, r) => <span className="text-xs text-slate-600">{r.note}</span> },
                { title: "Gửi lúc", width: 110, render: (_, r) => <span className="text-xs">{dayjs(r.createdAt).format("HH:mm DD/MM")}</span> },
                {
                  title: "",
                  width: 170,
                  render: (_, r) => (
                    <div className="flex gap-1">
                      <Button size="small" icon={<LuCheck size={12} />} onClick={() => markLeadSpam(r.id, false).then(() => { message.success("Đã chuyển vào danh sách tư vấn"); leads.load(); })}>
                        Không phải spam
                      </Button>
                      <Popconfirm title={`Chặn SĐT ${r.phone}?`} onConfirm={() => block("phone", r.phone, "Lead spam")}>
                        <Button size="small" danger icon={<LuBan size={12} />} />
                      </Popconfirm>
                    </div>
                  ),
                },
              ]}
            />
          )}

          {tab === "blocks" && (
            <>
              <div className="mb-3 flex flex-wrap gap-2">
                <Select value={draft.kind} onChange={(v) => setDraft({ ...draft, kind: v })} style={{ width: 110 }} options={[{ value: "ip", label: "IP" }, { value: "phone", label: "SĐT" }, { value: "user", label: "User ID" }]} />
                <Input style={{ width: 180 }} placeholder="Giá trị" value={draft.value} onChange={(e) => setDraft({ ...draft, value: e.target.value })} />
                <Input style={{ width: 220 }} placeholder="Lý do" value={draft.reason} onChange={(e) => setDraft({ ...draft, reason: e.target.value })} />
                <InputNumber style={{ width: 130 }} min={0} placeholder="Giờ (0 = mãi)" value={draft.hours} onChange={(v) => setDraft({ ...draft, hours: Number(v) || 0 })} />
                <Button
                  type="primary"
                  icon={<LuBan size={14} />}
                  onClick={() => {
                    if (!draft.value.trim() || !draft.reason.trim()) return message.warning("Nhập giá trị và lý do");
                    block(draft.kind, draft.value.trim(), draft.reason.trim(), draft.hours);
                    setDraft({ ...draft, value: "", reason: "" });
                  }}
                >
                  Chặn
                </Button>
              </div>
              <Table<SpamBlock>
                rowKey="id"
                size="small"
                loading={blocks.loading}
                dataSource={blocks.data ?? []}
                pagination={{ pageSize: 15 }}
                locale={{ emptyText: <Empty description="Chưa chặn ai" /> }}
                columns={[
                  { title: "Loại", width: 70, render: (_, r) => <Tag>{r.kind}</Tag> },
                  { title: "Giá trị", render: (_, r) => <span className="font-mono text-xs">{r.value}</span> },
                  { title: "Lý do", render: (_, r) => <span className="text-xs">{r.reason} {r.source === "auto" && <Tag color="purple">tự động</Tag>}</span> },
                  { title: "Chặn được", width: 90, render: (_, r) => `${r.hits} lần` },
                  {
                    title: "Hết hạn",
                    width: 120,
                    render: (_, r) =>
                      r.expiresAt ? (
                        <span className={`text-xs ${dayjs(r.expiresAt).isBefore(dayjs()) ? "text-slate-400 line-through" : ""}`}>{dayjs(r.expiresAt).format("HH:mm DD/MM")}</span>
                      ) : (
                        <span className="text-xs">Vĩnh viễn</span>
                      ),
                  },
                  {
                    title: "",
                    width: 50,
                    render: (_, r) => (
                      <Popconfirm title="Bỏ chặn?" onConfirm={() => removeSpamBlock(r.id).then(() => { blocks.load(); stats.load(); })}>
                        <Button size="small" icon={<LuTrash2 size={12} />} />
                      </Popconfirm>
                    ),
                  },
                ]}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}
