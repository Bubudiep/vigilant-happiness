import { useAtomValue, useSetAtom } from "jotai";
import { ReactNode, useCallback, useEffect, useState } from "react";
import {
  LuCircleCheck,
  LuCircleDot,
  LuCircle,
  LuLifeBuoy,
  LuLogOut,
  LuMessageCircle,
  LuPlus,
  LuRefreshCw,
  LuSend,
  LuSmartphone,
} from "react-icons/lu";
import { openMiniApp } from "zmp-sdk";
import { Page, Spinner, useNavigate, useSnackbar } from "zmp-ui";

import { Sheet } from "@/components/back-aware";
import { templateThumbnails } from "@/assets/thumbs";
import { appConfig } from "@/config";
import { company } from "@/data/company";
import { loginWithZalo, logout, sessionAtom } from "@/utils/auth";
import {
  closeTicket,
  countWaitingTickets,
  createTicket,
  fetchOverview,
  fetchTicket,
  PortalError,
  pendingTicketsAtom,
  unreadMessagesAtom,
  PortalOverview,
  PROJECT_STATUS,
  replyTicket,
  TICKET_CATEGORY,
  TICKET_STATUS,
  TicketDetail,
} from "@/utils/portal-api";
import { chatWithCompany } from "@/utils/zalo";
import { MessagesSheet } from "@/components/showcase/messages-sheet";

const fmtDate = (s?: string | null) => (s ? new Date(s).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—");
const fmtTime = (s: string) =>
  new Date(s).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });

function Pill({ label, color }: { label: string; color: string }) {
  return (
    <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: `${color}18`, color }}>
      {label}
    </span>
  );
}

function Block({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="mx-4 mt-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-bold text-gray-900">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Tab "Tài khoản": khách đăng nhập Zalo để xem Mini App đã đăng, tiến độ dự án, ticket hỗ trợ. */
export default function AccountPage() {
  const navigate = useNavigate();
  const { openSnackbar } = useSnackbar();
  const session = useAtomValue(sessionAtom);
  const setPending = useSetAtom(pendingTicketsAtom);
  const [data, setData] = useState<PortalOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);
  const [newTicket, setNewTicket] = useState(false);
  const [openTicket, setOpenTicket] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const unreadMsgs = useAtomValue(unreadMessagesAtom);

  const load = useCallback(async () => {
    if (!session?.accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const overview = await fetchOverview();
      setData(overview);
      setPending(countWaitingTickets(overview.tickets));
    } catch (e) {
      setError(e instanceof PortalError ? e.message : "Không tải được dữ liệu");
    } finally {
      setLoading(false);
    }
  }, [session?.accessToken, setPending]);

  useEffect(() => {
    load();
  }, [load]);

  const login = async () => {
    setLoggingIn(true);
    const r = await loginWithZalo();
    setLoggingIn(false);
    if (!r.ok) openSnackbar({ text: r.message, type: "warning" });
    else if (r.warning) openSnackbar({ text: r.warning, type: "info" });
  };

  const user = data?.user ?? session?.user;

  return (
    <Page className="bg-[#f4f6fb]">
      <div className="pb-28">
        <header className="bg-gradient-to-br from-brand-700 to-brand-500 text-white safe-top">
          <div className="zalo-capsule-space flex h-12 items-center pl-4 text-base font-bold">Tài khoản</div>
          <div className="flex items-center gap-3 px-4 pb-5 pt-1">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="h-14 w-14 rounded-full border-2 border-white/40 object-cover" />
            ) : (
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 text-xl font-bold">
                {user?.name?.slice(0, 1) ?? "?"}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate text-lg font-bold">{user?.name ?? "Khách"}</div>
              <div className="truncate text-xs text-white/80">
                {data?.customer ? data.customer.companyName || data.customer.name : session ? user?.phone ?? "Đã đăng nhập Zalo" : "Đăng nhập để theo dõi dự án"}
              </div>
            </div>
            {session && (
              <div className="flex gap-1.5">
                <button onClick={load} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15" aria-label="Làm mới">
                  <LuRefreshCw size={15} className={loading ? "animate-spin" : ""} />
                </button>
                <button
                  onClick={() => {
                    logout();
                    setData(null);
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15"
                  aria-label="Đăng xuất"
                >
                  <LuLogOut size={15} />
                </button>
              </div>
            )}
          </div>
        </header>

        {session && appConfig.apiUrl && (
          <button
            onClick={() => setChatOpen(true)}
            className="mx-4 mt-4 flex w-[calc(100%-2rem)] items-center gap-3 rounded-2xl bg-white p-4 text-left ring-1 ring-black/5"
          >
            <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
              <LuMessageCircle size={20} />
              {unreadMsgs > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{unreadMsgs}</span>
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-gray-900">Nhắn tin với {company.name}</span>
              <span className="block text-xs text-gray-500">Gửi câu hỏi, hình ảnh logo / sản phẩm để được tư vấn</span>
            </span>
          </button>
        )}

        {!session ? (
          <div className="mx-4 mt-4 rounded-2xl bg-white p-5 text-center ring-1 ring-black/5">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0068ff] text-sm font-black text-white">Zalo</div>
            <div className="mt-3 text-base font-bold text-gray-900">Theo dõi dự án Mini App của bạn</div>
            <p className="mt-1 text-xs leading-relaxed text-gray-500">
              Đăng nhập bằng số Zalo đã đăng ký hợp đồng với {company.name} để xem Mini App đã đăng, tiến độ công việc và trạng thái hỗ trợ.
            </p>
            <button
              onClick={login}
              disabled={loggingIn}
              className="mt-4 w-full rounded-xl bg-[#0068ff] py-3 text-sm font-bold text-white disabled:opacity-60"
            >
              {loggingIn ? "Đang kết nối Zalo…" : "Đăng nhập bằng Zalo"}
            </button>
          </div>
        ) : !appConfig.apiUrl ? (
          <Notice text="Ứng dụng chưa kết nối máy chủ nên chưa xem được dự án. Vui lòng liên hệ để được hỗ trợ." />
        ) : loading && !data ? (
          <div className="flex justify-center py-16">
            <Spinner visible />
          </div>
        ) : error ? (
          <Notice text={error} action={{ label: "Thử lại", onClick: load }} />
        ) : data && !data.customer ? (
          <div className="mx-4 mt-4 rounded-2xl bg-white p-5 ring-1 ring-black/5">
            <div className="text-sm font-bold text-gray-900">Chưa tìm thấy hợp đồng</div>
            <p className="mt-1 text-xs leading-relaxed text-gray-500">
              {data.user?.phone
                ? `Số Zalo ${data.user.phone} chưa gắn với dự án nào.`
                : "Zalo chưa chia sẻ số điện thoại nên chưa đối chiếu được hợp đồng."}{" "}
              Nếu bạn đã ký hợp đồng bằng số khác, hãy nhắn cho chúng tôi để gắn tài khoản.
            </p>
            <div className="mt-4 flex gap-2">
              <button onClick={() => navigate("/contact")} className="flex-1 rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white">
                Nhận tư vấn
              </button>
              <button
                onClick={() => chatWithCompany(`Gắn tài khoản Zalo ${data.user?.phone ?? ""} vào hợp đồng`)}
                className="flex-1 rounded-xl bg-brand-50 py-2.5 text-sm font-semibold text-brand-700"
              >
                Nhắn hỗ trợ
              </button>
            </div>
          </div>
        ) : data ? (
          <>
            <Block title={`Mini App của tôi (${data.apps.length})`}>
              {data.apps.length === 0 ? (
                <Empty text="Mini App sẽ xuất hiện ở đây khi được đăng lên Zalo." />
              ) : (
                <div className="space-y-2.5">
                  {data.apps.map((a) => (
                    <div key={a.id} className="flex gap-3 rounded-2xl bg-white p-3 ring-1 ring-black/5">
                      <img
                        src={a.logoUrl || templateThumbnails[a.templateId] || ""}
                        alt=""
                        className="h-16 w-16 shrink-0 rounded-xl bg-gray-100 object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="truncate text-sm font-bold text-gray-900">{a.name}</div>
                          <Pill label={a.active ? "Đang hoạt động" : "Tạm tắt"} color={a.active ? "#16a34a" : "#9ca3af"} />
                        </div>
                        <div className="mt-0.5 text-[11px] text-gray-500">
                          {a.subscription ? `${a.subscription.plan.name} · hết hạn ${fmtDate(a.subscription.expiresAt)}` : "Chưa gắn gói dịch vụ"}
                        </div>
                        <div className="mt-1 text-[11px] text-gray-400">
                          {a._count.products} sản phẩm · {a._count.customers} khách · {a._count.orders} đơn
                        </div>
                        {a.zaloAppId && (
                          <button
                            onClick={() =>
                              openMiniApp({ appId: a.zaloAppId! }).catch(() =>
                                openSnackbar({ text: "Không mở được Mini App", type: "warning" }),
                              )
                            }
                            className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600"
                          >
                            <LuSmartphone size={12} /> Mở Mini App
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Block>

            <Block title="Tiến độ công việc">
              {data.projects.length === 0 ? (
                <Empty text="Chưa có dự án nào đang triển khai." />
              ) : (
                <div className="space-y-2.5">
                  {data.projects.map((p) => {
                    const st = PROJECT_STATUS[p.status] ?? { label: p.status, color: "#64748b" };
                    return (
                      <div key={p.id} className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="text-sm font-bold text-gray-900">{p.name}</div>
                          <Pill label={st.label} color={st.color} />
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                            <div className="h-full rounded-full transition-all" style={{ width: `${p.progress}%`, background: st.color }} />
                          </div>
                          <span className="text-xs font-bold" style={{ color: st.color }}>
                            {p.progress}%
                          </span>
                        </div>
                        <div className="mt-1 text-[11px] text-gray-500">
                          Bắt đầu {fmtDate(p.startDate)} · Dự kiến xong {fmtDate(p.dueDate)}
                        </div>
                        {p.note && <div className="mt-2 rounded-lg bg-gray-50 p-2 text-xs text-gray-600">{p.note}</div>}
                        {p.milestones.length > 0 && (
                          <ol className="mt-3 space-y-2 border-l-2 border-gray-100 pl-3">
                            {p.milestones.map((m) => (
                              <li key={m.id} className="relative flex items-start gap-2 text-xs">
                                <span className="absolute -left-[21px] top-0 bg-white">
                                  {m.status === "done" ? (
                                    <LuCircleCheck size={16} className="text-green-600" />
                                  ) : m.status === "doing" ? (
                                    <LuCircleDot size={16} className="text-brand-600" />
                                  ) : (
                                    <LuCircle size={16} className="text-gray-300" />
                                  )}
                                </span>
                                <span className={`flex-1 ${m.status === "done" ? "text-gray-400 line-through" : m.status === "doing" ? "font-semibold text-gray-900" : "text-gray-600"}`}>
                                  {m.title}
                                </span>
                                <span className="text-[10px] text-gray-400">
                                  {m.status === "done" ? fmtDate(m.doneAt) : m.dueDate ? `hạn ${fmtDate(m.dueDate)}` : ""}
                                </span>
                              </li>
                            ))}
                          </ol>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Block>

            <Block
              title="Hỗ trợ & yêu cầu"
              action={
                <button onClick={() => setNewTicket(true)} className="flex items-center gap-1 text-xs font-semibold text-brand-600">
                  <LuPlus size={14} /> Tạo yêu cầu
                </button>
              }
            >
              {data.tickets.length === 0 ? (
                <Empty text="Chưa có yêu cầu hỗ trợ nào." icon={<LuLifeBuoy size={20} />} />
              ) : (
                <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
                  {data.tickets.map((t) => {
                    const st = TICKET_STATUS[t.status] ?? { label: t.status, color: "#64748b" };
                    const last = t.messages[0];
                    return (
                      <button key={t.id} onClick={() => setOpenTicket(t.id)} className="block w-full p-3 text-left">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-gray-900">{t.subject}</div>
                            <div className="text-[11px] text-gray-400">
                              {t.code} · {TICKET_CATEGORY[t.category] ?? t.category} · {fmtTime(t.lastReplyAt)}
                            </div>
                          </div>
                          <Pill label={st.label} color={st.color} />
                        </div>
                        {last && (
                          <div className="mt-1 line-clamp-1 text-xs text-gray-500">
                            {last.authorType === "staff" ? `${company.name}: ` : "Bạn: "}
                            {last.body}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </Block>
          </>
        ) : null}
      </div>

      <NewTicketSheet
        visible={newTicket}
        projects={data?.projects ?? []}
        onClose={() => setNewTicket(false)}
        onCreated={() => {
          setNewTicket(false);
          load();
        }}
      />
      <TicketSheet id={openTicket} onClose={() => setOpenTicket(null)} onChanged={load} />
      <MessagesSheet visible={chatOpen} onClose={() => setChatOpen(false)} />
    </Page>
  );
}

function Empty({ text, icon }: { text: string; icon?: ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-white p-4 text-xs text-gray-500 ring-1 ring-black/5">
      {icon}
      {text}
    </div>
  );
}

function Notice({ text, action }: { text: string; action?: { label: string; onClick: () => void } }) {
  return (
    <div className="mx-4 mt-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800 ring-1 ring-amber-200">
      {text}
      {action && (
        <button onClick={action.onClick} className="mt-2 block font-semibold text-amber-900 underline">
          {action.label}
        </button>
      )}
    </div>
  );
}

function NewTicketSheet({
  visible,
  projects,
  onClose,
  onCreated,
}: {
  visible: boolean;
  projects: PortalOverview["projects"];
  onClose: () => void;
  onCreated: () => void;
}) {
  const { openSnackbar } = useSnackbar();
  const [form, setForm] = useState({ subject: "", body: "", category: "technical", projectId: "", website: "" });
  const [sending, setSending] = useState(false);

  const submit = async () => {
    if (form.subject.trim().length < 5 || form.body.trim().length < 10) {
      openSnackbar({ text: "Nhập tiêu đề (≥ 5 ký tự) và mô tả (≥ 10 ký tự)", type: "warning" });
      return;
    }
    setSending(true);
    try {
      await createTicket({ ...form, projectId: form.projectId || undefined, website: form.website || undefined });
      openSnackbar({ text: "Đã gửi yêu cầu, chúng tôi sẽ phản hồi sớm", type: "success" });
      setForm({ subject: "", body: "", category: "technical", projectId: "", website: "" });
      onCreated();
    } catch (e) {
      openSnackbar({ text: e instanceof PortalError ? e.message : "Gửi thất bại", type: "warning" });
    } finally {
      setSending(false);
    }
  };

  const input = "w-full rounded-xl bg-gray-50 px-3 py-2.5 text-sm outline-none ring-1 ring-black/5 focus:ring-brand-500";
  return (
    <Sheet visible={visible} onClose={onClose} autoHeight mask handler swipeToClose title="Tạo yêu cầu hỗ trợ">
      <div className="space-y-3 px-4 pb-4 safe-bottom">
        <select className={input} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
          {Object.entries(TICKET_CATEGORY).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        {projects.length > 0 && (
          <select className={input} value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}>
            <option value="">Không gắn dự án</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
        <input className={input} placeholder="Tiêu đề *" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
        <textarea className={input} rows={4} placeholder="Mô tả chi tiết *" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
        {/* Ô bẫy chống spam — ẩn với người dùng */}
        <input
          tabIndex={-1}
          autoComplete="off"
          aria-hidden
          className="absolute -left-[9999px] h-0 w-0 opacity-0"
          value={form.website}
          onChange={(e) => setForm({ ...form, website: e.target.value })}
        />
        <button onClick={submit} disabled={sending} className="w-full rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white disabled:opacity-60">
          {sending ? "Đang gửi…" : "Gửi yêu cầu"}
        </button>
      </div>
    </Sheet>
  );
}

function TicketSheet({ id, onClose, onChanged }: { id: string | null; onClose: () => void; onChanged: () => void }) {
  const { openSnackbar } = useSnackbar();
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setTicket(null);
    setReply("");
    if (!id) return;
    fetchTicket(id)
      .then(setTicket)
      .catch((e) => openSnackbar({ text: e instanceof PortalError ? e.message : "Không tải được ticket", type: "warning" }));
  }, [id]);

  const send = async () => {
    if (!id || !reply.trim()) return;
    setBusy(true);
    try {
      setTicket(await replyTicket(id, reply));
      setReply("");
      onChanged();
    } catch (e) {
      openSnackbar({ text: e instanceof PortalError ? e.message : "Gửi thất bại", type: "warning" });
    } finally {
      setBusy(false);
    }
  };

  const close = async () => {
    if (!id) return;
    setBusy(true);
    try {
      setTicket(await closeTicket(id));
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  const st = ticket ? TICKET_STATUS[ticket.status] ?? { label: ticket.status, color: "#64748b" } : null;
  return (
    <Sheet visible={!!id} onClose={onClose} mask handler swipeToClose height="85vh">
      <div className="flex h-full flex-col px-4 pb-3 safe-bottom">
        {!ticket ? (
          <div className="flex flex-1 items-center justify-center">
            <Spinner visible />
          </div>
        ) : (
          <>
            <div className="border-b border-gray-100 pb-2">
              <div className="flex items-start justify-between gap-2">
                <div className="text-sm font-bold text-gray-900">{ticket.subject}</div>
                {st && <Pill label={st.label} color={st.color} />}
              </div>
              <div className="text-[11px] text-gray-400">
                {ticket.code} · {TICKET_CATEGORY[ticket.category] ?? ticket.category}
                {ticket.project && ` · ${ticket.project.name}`}
              </div>
            </div>
            <div className="flex-1 space-y-2.5 overflow-y-auto py-3">
              {ticket.messages.map((m) =>
                m.authorType === "system" ? (
                  <div key={m.id} className="text-center text-[11px] text-gray-400">
                    {m.body} · {fmtTime(m.createdAt)}
                  </div>
                ) : (
                  <div key={m.id} className={`flex ${m.authorType === "customer" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm ${
                        m.authorType === "customer" ? "rounded-br-sm bg-brand-600 text-white" : "rounded-bl-sm bg-gray-100 text-gray-800"
                      }`}
                    >
                      {m.authorType === "staff" && <div className="mb-0.5 text-[10px] font-semibold text-brand-700">{m.authorName}</div>}
                      <div className="whitespace-pre-wrap break-words">{m.body}</div>
                      <div className={`mt-0.5 text-[10px] ${m.authorType === "customer" ? "text-white/70" : "text-gray-400"}`}>{fmtTime(m.createdAt)}</div>
                    </div>
                  </div>
                ),
              )}
            </div>
            {ticket.status === "closed" ? (
              <div className="rounded-xl bg-gray-50 p-3 text-center text-xs text-gray-500">Ticket đã đóng</div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-end gap-2">
                  <textarea
                    rows={1}
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="Nhập phản hồi…"
                    className="max-h-28 flex-1 resize-none rounded-xl bg-gray-50 px-3 py-2.5 text-sm outline-none ring-1 ring-black/5"
                  />
                  <button
                    onClick={send}
                    disabled={busy || !reply.trim()}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white disabled:opacity-40"
                    aria-label="Gửi"
                  >
                    <LuSend size={16} />
                  </button>
                </div>
                {ticket.status === "resolved" && (
                  <button onClick={close} disabled={busy} className="w-full text-xs font-semibold text-gray-500">
                    Vấn đề đã xong? Đóng ticket
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </Sheet>
  );
}
