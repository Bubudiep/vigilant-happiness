import { Alert, App as AntApp, Badge, Button, Checkbox, DatePicker, Empty, Image, Input, Modal, Popconfirm, Select, Table, Tag } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LuArrowLeft, LuCheck, LuImagePlus, LuLink, LuPlug, LuRefreshCw, LuSend, LuTrash2 } from "react-icons/lu";
import {
  Channel,
  ConversationDetail,
  ConversationRow,
  createCare,
  deleteCare,
  fetchCare,
  fetchOaStatus,
  InboxMessage,
  OaStatus,
  patchCare,
  platformInboxOps,
  storeInboxOps,
  saveOaCredentials,
  CareTaskRow,
} from "../data/inbox-api";
import { ApiError, fetchCustomerRows, PlatformCustomerRow } from "../data/platform-api";
import { siteConfig } from "../data/site";
import { FilterBar, FilterSelect, PageHeader } from "./ui";

const errMsg = (e: unknown, fb = "Thao tác thất bại") => (e instanceof ApiError ? e.message : fb);
const customerLabel = (c: { name: string; companyName?: string | null }) => c.companyName || c.name;
const CHANNEL: Record<Channel, { label: string; color: string }> = {
  miniapp: { label: "Mini App", color: "blue" },
  oa: { label: "Zalo OA", color: "cyan" },
};
const shortTime = (iso: string) => {
  const d = dayjs(iso);
  return d.isSame(dayjs(), "day") ? d.format("HH:mm") : d.format("DD/MM");
};

function useCustomers(enabled = true) {
  const [rows, setRows] = useState<PlatformCustomerRow[]>([]);
  useEffect(() => {
    if (enabled) fetchCustomerRows().then(setRows).catch(() => undefined);
  }, [enabled]);
  return rows;
}
const customerOptions = (rows: PlatformCustomerRow[]) => rows.map((c) => ({ value: c.id, label: `${customerLabel(c)} · ${c.phone}` }));

// ═════════════════════════════ Kết nối Zalo OA ═════════════════════════════

function OaConnect({ onChanged }: { onChanged: () => void }) {
  const { message } = AntApp.useApp();
  const [status, setStatus] = useState<OaStatus | null>(null);
  const [open, setOpen] = useState(false);
  const [access, setAccess] = useState("");
  const [refresh, setRefresh] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    fetchOaStatus().then(setStatus).catch(() => setStatus(null));
  }, []);
  useEffect(load, [load]);

  if (!status) return null;
  const ok = status.configured && status.webhookReady;
  return (
    <>
      <div className={`mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs ${ok ? "border-green-200 bg-green-50 text-green-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
        <div>
          <b>Zalo OA:</b> {ok ? "đã kết nối — tin khách nhắn OA sẽ vào hộp thư, bạn trả lời từ đây." : `chưa kết nối đầy đủ${status.missing.length ? ` (thiếu: ${status.missing.join(", ")})` : ""}. Hộp thư vẫn dùng được cho khách nhắn từ Mini App.`}
        </div>
        <Button size="small" icon={<LuPlug size={13} />} onClick={() => setOpen(true)}>
          {ok ? "Cài đặt" : "Kết nối OA"}
        </Button>
      </div>
      <Modal
        title="Kết nối Zalo OA"
        open={open}
        onCancel={() => setOpen(false)}
        okText="Lưu token"
        confirmLoading={saving}
        okButtonProps={{ disabled: !access.trim() || !refresh.trim() }}
        onOk={async () => {
          setSaving(true);
          try {
            setStatus(await saveOaCredentials(access, refresh));
            setAccess("");
            setRefresh("");
            message.success("Đã lưu token OA");
            onChanged();
          } catch (e) {
            message.error(errMsg(e));
          } finally {
            setSaving(false);
          }
        }}
        destroyOnHidden
      >
        <div className="space-y-3 text-xs text-slate-600">
          <ol className="list-decimal space-y-1 pl-4">
            <li>
              Trong <b>backend/.env</b> điền <code>ZALO_APP_ID</code>, <code>ZALO_APP_SECRET</code>, <code>ZALO_OA_SECRET</code> rồi khởi động lại backend.
            </li>
            <li>
              Ở Zalo for Developers → Webhook của ứng dụng, đặt URL: <code className="break-all">{siteConfig.apiUrl}/oa/webhook</code> (phải là https, tên miền công khai) và bật sự kiện <i>user_send_text</i>, <i>user_send_image</i>, <i>follow</i>.
            </li>
            <li>Lấy access token + refresh token của OA (công cụ API Explorer hoặc OAuth OA) rồi dán vào dưới. Backend tự làm mới token và lưu lại.</li>
          </ol>
          <Input.TextArea rows={2} placeholder="Access token OA" value={access} onChange={(e) => setAccess(e.target.value)} autoComplete="off" />
          <Input.TextArea rows={2} placeholder="Refresh token OA" value={refresh} onChange={(e) => setRefresh(e.target.value)} autoComplete="off" />
          {status.tokenExpiresAt && <div>Access token hiện tại hết hạn: {dayjs(status.tokenExpiresAt).format("HH:mm DD/MM/YYYY")} {status.canRefresh ? "(tự làm mới)" : "(chưa thể tự làm mới)"}</div>}
          <p className="text-xs text-slate-500">Token được lưu trong cơ sở dữ liệu backend, không hiển thị lại. Zalo chỉ cho trả lời tin tư vấn trong thời hạn sau lần khách nhắn gần nhất.</p>
        </div>
      </Modal>
    </>
  );
}

// ═════════════════════════════ Hộp thư ═════════════════════════════

function Bubble({ m }: { m: InboxMessage }) {
  const mine = m.direction === "out";
  const note = m.direction === "note";
  return (
    <div className={`flex ${mine || note ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm ${
          note ? "border border-dashed border-amber-300 bg-amber-50 text-amber-900" : mine ? "bg-blue-600 text-white" : "border border-slate-200 bg-white text-slate-900"
        }`}
      >
        {note && <div className="mb-0.5 text-xs font-bold uppercase">Ghi chú nội bộ</div>}
        {m.image && <Image src={m.image.url} alt={m.image.filename} width={200} style={{ borderRadius: 10, maxHeight: 260, objectFit: "cover" }} />}
        {m.body && <div className="whitespace-pre-wrap break-words">{m.body}</div>}
        <div className={`mt-1 text-xs ${mine ? "text-blue-100" : "text-slate-400"}`}>
          {m.staffLabel ? `${m.staffLabel} · ` : ""}
          {dayjs(m.createdAt).format("HH:mm DD/MM")}
        </div>
        {m.delivery === "failed" && <div className="mt-1 rounded bg-red-100 px-1.5 py-0.5 text-xs font-semibold text-red-700">Chưa gửi được tới khách: {m.error}</div>}
      </div>
    </div>
  );
}

/** storeId có giá trị → hộp thư Zalo OA riêng của gian hàng (chủ shop); không có → hộp thư reMini (quản trị viên). */
export function InboxSection({ onUnreadChange, storeId }: { onUnreadChange?: () => void; storeId?: string }) {
  const { message } = AntApp.useApp();
  const customers = useCustomers(!storeId);
  const ops = useMemo(() => (storeId ? storeInboxOps(storeId) : platformInboxOps), [storeId]);
  const [status, setStatus] = useState("open");
  const [channel, setChannel] = useState("");
  const [q, setQ] = useState("");
  const [list, setList] = useState<ConversationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [text, setText] = useState("");
  const [internal, setInternal] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [care, setCare] = useState<{ title: string; dueAt: Dayjs | null; note: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      setList(await ops.list({ status: status === "all" ? undefined : status, channel: channel || undefined, q: q || undefined }));
      setError(null);
    } catch (e) {
      setError(errMsg(e, "Không tải được hộp thư"));
    } finally {
      setLoading(false);
    }
  }, [ops, status, channel, q]);

  const loadDetail = useCallback(
    async (id: string) => {
      try {
        const d = await ops.get(id);
        setDetail((cur) => (cur?.id === id && cur.messages.length === d.messages.length && cur.status === d.status ? cur : d));
        onUnreadChange?.();
      } catch (e) {
        message.error(errMsg(e));
      }
    },
    [ops, message, onUnreadChange],
  );

  useEffect(() => {
    loadList();
    const t = setInterval(loadList, 15000);
    return () => clearInterval(t);
  }, [loadList]);

  useEffect(() => {
    setDetail(null);
    if (!openId) return;
    loadDetail(openId);
    const t = setInterval(() => loadDetail(openId), 8000);
    return () => clearInterval(t);
  }, [openId, loadDetail]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [detail?.messages.length, detail?.id]);

  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  const send = async () => {
    if (!detail || sending || (!text.trim() && !file)) return;
    setSending(true);
    try {
      const m = await ops.send(detail.id, { body: text.trim(), internal, file });
      setText("");
      setFile(null);
      if (m.delivery === "failed") message.warning(m.error || "Chưa gửi được tới khách");
      await loadDetail(detail.id);
      loadList();
    } catch (e) {
      message.error(errMsg(e));
    } finally {
      setSending(false);
    }
  };

  const pickFile = (f: File | undefined) => {
    if (!f) return;
    if (!/^image\/(jpeg|png|webp|gif)$/.test(f.type)) return message.warning("Chỉ gửi ảnh JPG, PNG, WebP hoặc GIF");
    if (f.size > 8 * 1024 * 1024) return message.warning("Ảnh tối đa 8MB");
    setFile(f);
  };

  return (
    <div className="space-y-3">
      {!storeId && <OaConnect onChanged={loadList} />}
      {error && <Alert type="warning" showIcon title={error} action={<Button size="small" onClick={loadList}>Thử lại</Button>} />}
      <div className="grid h-[calc(100vh-230px)] min-h-[480px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:grid-cols-[330px_1fr]">
        {/* Danh sách */}
        <div className={`flex min-h-0 flex-col border-r border-slate-200 ${openId ? "hidden lg:flex" : "flex"}`}>
          <div className="space-y-2 border-b border-slate-100 p-3">
            <div className="flex gap-2">
              <Select
               
                value={status}
                onChange={setStatus}
                className="flex-1"
                options={[
                  { value: "open", label: "Đang mở" },
                  { value: "closed", label: "Đã đóng" },
                  { value: "all", label: "Tất cả" },
                ]}
              />
              {!storeId && (
                <Select
                  value={channel}
                  onChange={setChannel}
                  className="flex-1"
                  options={[
                    { value: "", label: "Mọi kênh" },
                    { value: "miniapp", label: "Mini App" },
                    { value: "oa", label: "Zalo OA" },
                  ]}
                />
              )}
              <Button icon={<LuRefreshCw size={14} />} onClick={loadList} loading={loading} />
            </div>
            <Input.Search allowClear placeholder="Tìm tên / SĐT / nội dung" onSearch={setQ} />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {list.length === 0 && <Empty className="mt-10" description="Chưa có hội thoại" />}
            {list.map((c) => (
              <button
                key={c.id}
                onClick={() => setOpenId(c.id)}
                className={`flex w-full items-start gap-2.5 border-b border-slate-100 px-3 py-2.5 text-left hover:bg-slate-50 ${openId === c.id ? "bg-blue-50" : ""}`}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-200 text-sm font-bold text-slate-600">
                  {c.avatarUrl ? <img src={c.avatarUrl} alt="" className="h-full w-full object-cover" /> : c.displayName.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-slate-900">{c.customer ? customerLabel(c.customer) : c.displayName}</span>
                    <span className="shrink-0 text-xs text-slate-400">{shortTime(c.lastMessageAt)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs text-slate-500">{c.lastPreview}</span>
                    {c.unreadStaff > 0 && <Badge count={c.unreadStaff} size="small" />}
                  </div>
                  <Tag className="!mt-1 !text-xs" color={CHANNEL[c.channel].color} variant="filled">
                    {CHANNEL[c.channel].label}
                  </Tag>
                  {c.status === "closed" && <Tag className="!mt-1 !text-xs">Đã đóng</Tag>}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Hội thoại */}
        <div className={`min-h-0 flex-col ${openId ? "flex" : "hidden lg:flex"}`}>
          {!openId || !detail ? (
            <div className="flex flex-1 items-center justify-center text-sm text-slate-400">{openId ? "Đang tải…" : "Chọn một hội thoại để xem và trả lời"}</div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-3 py-2">
                <Button className="lg:!hidden" size="small" type="text" icon={<LuArrowLeft size={16} />} onClick={() => setOpenId(null)} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold text-slate-900">{detail.displayName}</div>
                  <div className="text-xs text-slate-500">
                    <Tag color={CHANNEL[detail.channel].color} variant="filled">
                      {CHANNEL[detail.channel].label}
                    </Tag>
                    {detail.phone && <span className="font-mono">{detail.phone}</span>}
                  </div>
                </div>
                {!storeId && (
                <Select
                  size="small"
                  showSearch
                  allowClear
                  style={{ width: 210 }}
                  placeholder="Gắn khách hàng reMini"
                  suffixIcon={<LuLink size={13} />}
                  optionFilterProp="label"
                  value={detail.customerId ?? undefined}
                  options={customerOptions(customers)}
                  onChange={async (v) => {
                    try {
                      await ops.patch(detail.id, { customerId: v ?? null });
                      message.success(v ? "Đã gắn khách — ảnh trong hội thoại thuộc khách này" : "Đã bỏ gắn khách");
                      loadDetail(detail.id);
                      loadList();
                    } catch (e) {
                      message.error(errMsg(e));
                    }
                  }}
                />
                )}
                {!storeId && <Button size="small" onClick={() => setCare({ title: `Chăm sóc ${detail.displayName}`, dueAt: dayjs().add(1, "day").hour(9).minute(0), note: "" })}>
                  Hẹn chăm sóc
                </Button>}
                <Button
                  size="small"
                  onClick={async () => {
                    await ops.patch(detail.id, { status: detail.status === "open" ? "closed" : "open" }).catch((e) => message.error(errMsg(e)));
                    loadDetail(detail.id);
                    loadList();
                  }}
                >
                  {detail.status === "open" ? "Đóng" : "Mở lại"}
                </Button>
              </div>

              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-slate-50 p-3">
                {detail.messages.map((m) => (
                  <Bubble key={m.id} m={m} />
                ))}
                {detail.messages.length === 0 && <div className="py-8 text-center text-xs text-slate-400">Chưa có tin nhắn</div>}
                <div ref={endRef} />
              </div>

              <div className="border-t border-slate-100 p-3">
                {preview && (
                  <div className="mb-2 flex items-center gap-2">
                    <img src={preview} alt="" className="h-14 w-14 rounded-lg object-cover" />
                    <Button size="small" type="text" danger onClick={() => setFile(null)}>
                      Bỏ ảnh
                    </Button>
                  </div>
                )}
                <div className="flex items-end gap-2">
                  <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={(e) => (pickFile(e.target.files?.[0]), (e.target.value = ""))} />
                  <Button icon={<LuImagePlus size={16} />} disabled={internal} onClick={() => fileRef.current?.click()} />
                  <Input.TextArea
                    autoSize={{ minRows: 1, maxRows: 5 }}
                    maxLength={2000}
                    value={text}
                    placeholder={internal ? "Ghi chú nội bộ (khách không thấy)…" : "Nhập tin nhắn… (Enter để gửi, Shift+Enter xuống dòng)"}
                    onChange={(e) => setText(e.target.value)}
                    onPressEnter={(e) => {
                      if (!e.shiftKey) {
                        e.preventDefault();
                        send();
                      }
                    }}
                    style={internal ? { background: "#fffbeb" } : undefined}
                  />
                  <Button type="primary" icon={<LuSend size={15} />} loading={sending} onClick={send} disabled={!text.trim() && !file}>
                    Gửi
                  </Button>
                </div>
                <Checkbox
                  className="!mt-1.5 !text-xs"
                  checked={internal}
                  onChange={(e) => {
                    setInternal(e.target.checked);
                    if (e.target.checked) setFile(null);
                  }}
                >
                  Ghi chú nội bộ (khách không thấy)
                </Checkbox>
              </div>
            </>
          )}
        </div>
      </div>

      <Modal
        title="Hẹn chăm sóc khách"
        open={!!care}
        onCancel={() => setCare(null)}
        okText="Tạo"
        destroyOnHidden
        onOk={async () => {
          if (!care || !detail) return;
          if (!care.title.trim() || !care.dueAt) return message.warning("Nhập nội dung và thời hạn");
          try {
            await createCare({ title: care.title, dueAt: care.dueAt.toISOString(), note: care.note || undefined, conversationId: detail.id });
            message.success("Đã tạo — hệ thống sẽ nhắc khi đến hạn");
            setCare(null);
          } catch (e) {
            message.error(errMsg(e));
          }
        }}
      >
        {care && (
          <div className="space-y-3 pt-2">
            <Input value={care.title} maxLength={200} onChange={(e) => setCare({ ...care, title: e.target.value })} placeholder="Việc cần làm *" />
            <DatePicker className="w-full" showTime={{ format: "HH:mm" }} format="DD/MM/YYYY HH:mm" value={care.dueAt} onChange={(v) => setCare({ ...care, dueAt: v })} />
            <Input.TextArea rows={2} value={care.note} maxLength={500} onChange={(e) => setCare({ ...care, note: e.target.value })} placeholder="Ghi chú" />
          </div>
        )}
      </Modal>
    </div>
  );
}

// ═════════════════════════════ Chăm sóc khách ═════════════════════════════

export function CareSection({ onChanged }: { onChanged?: () => void }) {
  const { message } = AntApp.useApp();
  const customers = useCustomers();
  const [status, setStatus] = useState("open");
  const [rows, setRows] = useState<CareTaskRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<{ customerId?: string; title: string; dueAt: Dayjs | null; note: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await fetchCare({ status: status === "all" ? undefined : status }));
      setError(null);
    } catch (e) {
      setError(errMsg(e, "Không tải được việc chăm sóc"));
    } finally {
      setLoading(false);
    }
  }, [status]);
  useEffect(() => {
    load();
  }, [load]);

  const changed = () => {
    load();
    onChanged?.();
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <PageHeader
        title="Chăm sóc khách hàng"
        description={<>Việc hẹn chăm sóc (hỏi thăm sau bàn giao, nhắc gia hạn, gửi ưu đãi…). Đến hạn hệ thống nhắn nhân viên qua Telegram/webhook.</>}
      />
      <FilterBar
        filters={<><FilterSelect
            value={status}
            onChange={setStatus}
            options={[
              { value: "open", label: "Chưa xong" },
              { value: "done", label: "Đã xong" },
              { value: "all", label: "Tất cả" },
            ]}
          /></>}
        actions={<><Button icon={<LuRefreshCw size={14} />} onClick={load} loading={loading} />
<Button type="primary" onClick={() => setForm({ title: "", dueAt: dayjs().add(1, "day").hour(9).minute(0), note: "" })}>
            Thêm việc
          </Button></>}
      />
      {error ? (
        <Alert type="warning" showIcon title={error} action={<Button size="small" onClick={load}>Thử lại</Button>} />
      ) : (
        <Table<CareTaskRow>
          rowKey="id"
          size="small"
          loading={loading}
          dataSource={rows}
          pagination={{ pageSize: 12, hideOnSinglePage: true }}
          scroll={{ x: 640 }}
          locale={{ emptyText: <Empty description="Không có việc nào" /> }}
          columns={[
            {
              title: "Việc cần làm",
              render: (_, r) => (
                <div>
                  <div className={`text-sm font-semibold ${r.doneAt ? "text-slate-400 line-through" : "text-slate-900"}`}>{r.title}</div>
                  {r.note && <div className="text-xs text-slate-500">{r.note}</div>}
                </div>
              ),
            },
            {
              title: "Khách",
              render: (_, r) =>
                r.customer ? (
                  <div>
                    <div className="text-xs font-semibold">{customerLabel(r.customer)}</div>
                    <div className="font-mono text-xs text-slate-500">{r.customer.phone}</div>
                  </div>
                ) : (
                  <span className="text-xs text-slate-500">{r.conversation?.displayName ?? "—"}</span>
                ),
            },
            {
              title: "Hạn",
              width: 130,
              render: (_, r) => {
                const late = !r.doneAt && dayjs(r.dueAt).isBefore(dayjs());
                return <span className={`text-xs ${late ? "font-bold text-red-600" : ""}`}>{dayjs(r.dueAt).format("HH:mm DD/MM/YYYY")}{late ? " · trễ" : ""}</span>;
              },
            },
            {
              title: "",
              width: 150,
              render: (_, r) => (
                <div className="flex gap-1">
                  <Button
                    size="small"
                    type={r.doneAt ? "default" : "primary"}
                    icon={<LuCheck size={12} />}
                    onClick={() =>
                      patchCare(r.id, { done: !r.doneAt })
                        .then(changed)
                        .catch((e) => message.error(errMsg(e)))
                    }
                  >
                    {r.doneAt ? "Mở lại" : "Xong"}
                  </Button>
                  <Popconfirm
                    title="Xoá việc này?"
                    onConfirm={() =>
                      deleteCare(r.id)
                        .then(changed)
                        .catch((e) => message.error(errMsg(e)))
                    }
                  >
                    <Button size="small" danger icon={<LuTrash2 size={12} />} />
                  </Popconfirm>
                </div>
              ),
            },
          ]}
        />
      )}
      <Modal
        title="Thêm việc chăm sóc"
        open={!!form}
        onCancel={() => setForm(null)}
        okText="Tạo"
        destroyOnHidden
        onOk={async () => {
          if (!form) return;
          if (!form.customerId) return message.warning("Chọn khách hàng");
          if (!form.title.trim() || !form.dueAt) return message.warning("Nhập nội dung và thời hạn");
          try {
            await createCare({ customerId: form.customerId, title: form.title, dueAt: form.dueAt.toISOString(), note: form.note || undefined });
            setForm(null);
            changed();
          } catch (e) {
            message.error(errMsg(e));
          }
        }}
      >
        {form && (
          <div className="space-y-3 pt-2">
            <Select showSearch className="w-full" placeholder="Chọn khách hàng *" optionFilterProp="label" value={form.customerId} onChange={(v) => setForm({ ...form, customerId: v })} options={customerOptions(customers)} />
            <Input value={form.title} maxLength={200} placeholder="Việc cần làm * (VD: Hỏi thăm sau bàn giao)" onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <DatePicker className="w-full" showTime={{ format: "HH:mm" }} format="DD/MM/YYYY HH:mm" value={form.dueAt} onChange={(v) => setForm({ ...form, dueAt: v })} />
            <Input.TextArea rows={2} value={form.note} maxLength={500} placeholder="Ghi chú" onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </div>
        )}
      </Modal>
    </div>
  );
}
