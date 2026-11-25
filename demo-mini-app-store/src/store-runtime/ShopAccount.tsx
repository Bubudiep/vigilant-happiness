import { useCallback, useEffect, useRef, useState } from "react";
import { LuChevronLeft, LuExternalLink, LuImages, LuLoader, LuLogIn, LuMessageCircle, LuSend, LuUser, LuX } from "react-icons/lu";
import { openWebview } from "zmp-sdk";

import {
  fetchMyAlbum,
  fetchMyAlbums,
  fetchMyMessages,
  fetchMyUnread,
  sendMyMessage,
  ShopAlbumDetail,
  ShopAlbumSummary,
  ShopMessage,
  ShopUnread,
} from "./shop-api";
import { getShopSession, ShopApiError, ShopAuthError, shopLogin, ShopSession } from "./shop-session";

/**
 * Khu vực khách của gian hàng (album ảnh + tin nhắn): nút nổi nhỏ ở góc dưới phải, mở panel toàn màn hình.
 * Không đụng tới bộ render thiết kế: chỉ gắn thêm một lớp phủ trong StoreScreen.
 */

type View = { name: "albums" } | { name: "album"; id: string } | { name: "messages" };

const errText = (e: unknown, fb = "Có lỗi xảy ra, thử lại sau") => (e instanceof ShopApiError || e instanceof ShopAuthError ? e.message : fb);

function openLink(url: string) {
  openWebview({ url }).catch(() => {
    try {
      window.open(url, "_blank");
    } catch {
      // bỏ qua
    }
  });
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });
}

export function ShopAccountButton({ slug, primary, bottomOffset, topInset }: { slug: string; primary: string; bottomOffset: number; topInset: number }) {
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<ShopSession | null>(() => getShopSession(slug));
  const [unread, setUnread] = useState<ShopUnread | null>(null);

  const refreshUnread = useCallback(() => {
    if (!getShopSession(slug)) return;
    fetchMyUnread(slug)
      .then(setUnread)
      .catch((e) => {
        if (e instanceof ShopAuthError) setSession(null);
      });
  }, [slug]);

  useEffect(() => {
    refreshUnread();
  }, [refreshUnread, session]);

  const dot = (unread?.messages ?? 0) + (unread?.albums ?? 0);

  return (
    <>
      <button
        type="button"
        aria-label="Tài khoản của tôi"
        onClick={() => setOpen(true)}
        className="absolute right-3 z-30 flex h-11 w-11 items-center justify-center rounded-full text-white shadow-lg ring-2 ring-white/70"
        style={{ bottom: bottomOffset, background: primary }}
      >
        <LuUser size={20} />
        {dot > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {dot > 9 ? "9+" : dot}
          </span>
        )}
      </button>
      {open && (
        <ShopPanel
          slug={slug}
          primary={primary}
          topInset={topInset}
          session={session}
          onSession={setSession}
          onClose={() => {
            setOpen(false);
            refreshUnread();
          }}
        />
      )}
    </>
  );
}

function ShopPanel({
  slug,
  primary,
  topInset,
  session,
  onSession,
  onClose,
}: {
  slug: string;
  primary: string;
  topInset: number;
  session: ShopSession | null;
  onSession: (s: ShopSession | null) => void;
  onClose: () => void;
}) {
  const [view, setView] = useState<View>({ name: "albums" });
  const [loginErr, setLoginErr] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);
  const tab = view.name === "messages" ? "messages" : "albums";

  const doLogin = async () => {
    setLoggingIn(true);
    setLoginErr(null);
    try {
      onSession(await shopLogin(slug));
    } catch (e) {
      setLoginErr(errText(e, "Đăng nhập không thành công, vui lòng thử lại"));
    } finally {
      setLoggingIn(false);
    }
  };

  const expired = useCallback(() => onSession(null), [onSession]);

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-slate-50" style={{ paddingTop: topInset }}>
      <div className="flex shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-3 py-2">
        {view.name === "album" ? (
          <button type="button" onClick={() => setView({ name: "albums" })} className="-ml-1 p-1 text-slate-700">
            <LuChevronLeft size={22} />
          </button>
        ) : (
          <LuUser size={18} className="text-slate-500" />
        )}
        <div className="min-w-0 flex-1 truncate text-sm font-bold text-slate-900">
          {session?.customer?.name ? `Xin chào, ${session.customer.name}` : "Tài khoản của tôi"}
        </div>
        <button type="button" onClick={onClose} className="rounded-full bg-slate-100 p-1.5 text-slate-500">
          <LuX size={16} />
        </button>
      </div>

      {!session ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <LuLogIn size={26} />
          </span>
          <div className="text-base font-bold text-slate-900">Đăng nhập để xem album và tin nhắn</div>
          <div className="text-sm text-slate-500">Dùng tài khoản Zalo để xem ảnh cửa hàng gửi cho bạn và nhắn tin với cửa hàng.</div>
          {loginErr && <div className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">{loginErr}</div>}
          <button
            type="button"
            disabled={loggingIn}
            onClick={doLogin}
            className="flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-bold text-white disabled:opacity-60"
            style={{ background: primary }}
          >
            {loggingIn && <LuLoader size={15} className="animate-spin" />} Đăng nhập bằng Zalo
          </button>
        </div>
      ) : (
        <>
          {view.name !== "album" && (
            <div className="grid shrink-0 grid-cols-2 gap-1 bg-white px-3 pb-2 pt-1 text-xs font-bold">
              {(
                [
                  ["albums", "Album ảnh", LuImages],
                  ["messages", "Tin nhắn", LuMessageCircle],
                ] as const
              ).map(([k, label, I]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setView(k === "albums" ? { name: "albums" } : { name: "messages" })}
                  className={`flex items-center justify-center gap-1.5 rounded-lg py-2 ${tab === k ? "text-white" : "bg-slate-100 text-slate-500"}`}
                  style={tab === k ? { background: primary } : undefined}
                >
                  <I size={14} /> {label}
                </button>
              ))}
            </div>
          )}
          <div className="min-h-0 flex-1 overflow-y-auto" style={{ paddingBottom: "var(--zaui-safe-area-inset-bottom, 0px)" }}>
            {view.name === "albums" && <AlbumList slug={slug} onOpen={(id) => setView({ name: "album", id })} onExpired={expired} />}
            {view.name === "album" && <AlbumView slug={slug} id={view.id} primary={primary} onExpired={expired} />}
            {view.name === "messages" && <Messages slug={slug} primary={primary} onExpired={expired} />}
          </div>
        </>
      )}
    </div>
  );
}

/** Tải dữ liệu: loading / lỗi (kèm thử lại) / dữ liệu. Hết phiên → báo lên panel để hiện lại màn đăng nhập. */
function useRemote<T>(load: () => Promise<T>, onExpired: () => void, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    setError(null);
    load()
      .then((d) => alive && setData(d))
      .catch((e) => {
        if (!alive) return;
        if (e instanceof ShopAuthError) onExpired();
        else setError(errText(e, "Không tải được dữ liệu"));
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  return { data, setData, error, retry: () => setTick((t) => t + 1) };
}

const Loading = () => (
  <div className="flex justify-center py-12 text-slate-400">
    <LuLoader size={22} className="animate-spin" />
  </div>
);

const ErrorBox = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <div className="m-4 rounded-2xl bg-white p-5 text-center shadow-sm">
    <div className="text-sm text-slate-600">{message}</div>
    <button type="button" onClick={onRetry} className="mt-3 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white">
      Thử lại
    </button>
  </div>
);

function AlbumList({ slug, onOpen, onExpired }: { slug: string; onOpen: (id: string) => void; onExpired: () => void }) {
  const { data, error, retry } = useRemote<ShopAlbumSummary[]>(() => fetchMyAlbums(slug), onExpired, [slug]);
  if (error) return <ErrorBox message={error} onRetry={retry} />;
  if (!data) return <Loading />;
  if (!data.length) return <div className="px-8 py-16 text-center text-sm text-slate-400">Chưa có album nào được gửi cho bạn</div>;
  return (
    <div className="grid grid-cols-2 gap-3 p-3">
      {data.map((a) => (
        <button key={a.id} type="button" onClick={() => onOpen(a.id)} className="overflow-hidden rounded-2xl bg-white text-left shadow-sm">
          <div className="relative aspect-square bg-slate-100">
            {a.coverUrl && <img src={a.coverUrl} alt={a.title} loading="lazy" className="h-full w-full object-cover" />}
            {a.isNew && <span className="absolute left-2 top-2 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">Mới</span>}
          </div>
          <div className="p-2.5">
            <div className="truncate text-[13px] font-bold text-slate-900">{a.title}</div>
            <div className="text-[11px] text-slate-500">
              {a.photoCount} ảnh{a.eventDate ? ` · ${a.eventDate}` : ""}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

function AlbumView({ slug, id, primary, onExpired }: { slug: string; id: string; primary: string; onExpired: () => void }) {
  const { data, error, retry } = useRemote<ShopAlbumDetail>(() => fetchMyAlbum(slug, id), onExpired, [slug, id]);
  const [big, setBig] = useState<string | null>(null);
  if (error) return <ErrorBox message={error} onRetry={retry} />;
  if (!data) return <Loading />;
  return (
    <div className="p-3">
      <div className="text-base font-extrabold text-slate-900">{data.title}</div>
      <div className="text-xs text-slate-500">
        {data.photos.length} ảnh{data.eventDate ? ` · ${data.eventDate}` : ""}
      </div>
      {data.note && <div className="mt-2 rounded-xl bg-white p-3 text-xs leading-relaxed text-slate-600">{data.note}</div>}
      {data.links.length > 0 && (
        <div className="mt-3 space-y-2">
          {data.links.map((l, i) => (
            <button
              key={`${l.url}-${i}`}
              type="button"
              onClick={() => openLink(l.url)}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-white"
              style={{ background: primary }}
            >
              <LuExternalLink size={15} /> {l.label || "Mở ảnh gốc"}
            </button>
          ))}
        </div>
      )}
      <div className="mt-3 grid grid-cols-3 gap-1.5">
        {data.photos.map((p) => (
          <button key={p.id} type="button" onClick={() => setBig(p.url)} className="aspect-square overflow-hidden rounded-lg bg-slate-200">
            <img src={p.thumbUrl} alt={p.filename ?? ""} loading="lazy" className="h-full w-full object-cover" />
          </button>
        ))}
      </div>
      {big && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90" onClick={() => setBig(null)}>
          <img src={big} alt="" className="max-h-full max-w-full object-contain" />
          <button type="button" className="absolute right-3 top-3 rounded-full bg-white/20 p-2 text-white" onClick={() => setBig(null)}>
            <LuX size={18} />
          </button>
        </div>
      )}
    </div>
  );
}

function Messages({ slug, primary, onExpired }: { slug: string; primary: string; onExpired: () => void }) {
  const { data, setData, error, retry } = useRemote<ShopMessage[]>(() => fetchMyMessages(slug), onExpired, [slug]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendErr, setSendErr] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [data]);

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setSendErr(null);
    try {
      const m = await sendMyMessage(slug, body);
      setData((list) => [...(list ?? []), m]);
      setText("");
    } catch (e) {
      if (e instanceof ShopAuthError) onExpired();
      else setSendErr(errText(e, "Chưa gửi được tin nhắn"));
    } finally {
      setSending(false);
    }
  };

  if (error) return <ErrorBox message={error} onRetry={retry} />;
  if (!data) return <Loading />;
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {data.length === 0 && <div className="py-12 text-center text-sm text-slate-400">Chưa có tin nhắn. Hãy nhắn cho cửa hàng nhé!</div>}
        {data.map((m) => {
          const mine = m.direction === "in";
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-[13px] ${mine ? "text-white" : "bg-white text-slate-800 shadow-sm"}`}
                style={mine ? { background: primary } : undefined}
              >
                {m.body}
                <div className={`mt-0.5 text-[10px] ${mine ? "text-white/70" : "text-slate-400"}`}>{fmtTime(m.createdAt)}</div>
              </div>
            </div>
          );
        })}
        <div ref={end} />
      </div>
      {sendErr && <div className="bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800">{sendErr}</div>}
      <div className="flex shrink-0 items-center gap-2 border-t border-slate-200 bg-white p-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          maxLength={2000}
          placeholder="Nhập tin nhắn…"
          className="min-w-0 flex-1 rounded-full bg-slate-100 px-4 py-2.5 text-sm outline-none"
        />
        <button
          type="button"
          disabled={sending || !text.trim()}
          onClick={send}
          className="flex h-10 w-10 items-center justify-center rounded-full text-white disabled:opacity-50"
          style={{ background: primary }}
        >
          {sending ? <LuLoader size={16} className="animate-spin" /> : <LuSend size={16} />}
        </button>
      </div>
    </div>
  );
}
