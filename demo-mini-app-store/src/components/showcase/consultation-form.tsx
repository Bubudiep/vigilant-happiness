import { useAtomValue } from "jotai";
import { useEffect, useMemo, useState } from "react";
import { LuBadgeCheck, LuCalendarClock, LuLogOut, LuMessageSquareText } from "react-icons/lu";
import { useSnackbar } from "zmp-ui";

import { categories } from "@/data/categories";
import { CALLBACK_SLOTS, submitLead } from "@/utils/api";
import { loginWithZalo, logout, sessionAtom } from "@/utils/auth";
import { fetchFormToken } from "@/utils/portal-api";
import { chatWithCompany } from "@/utils/zalo";

type Mode = "consultation" | "callback";

const WEEKDAY = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

/** 7 ngày tới (bỏ Chủ nhật) theo giờ Việt Nam, dạng { iso: "2026-11-21", label: "T6", day: "21/11" }. */
function nextDays(count = 6) {
  const out: { iso: string; weekday: string; day: string; today: boolean }[] = [];
  const base = new Date(Date.now() + 7 * 3600 * 1000); // "bây giờ" ở UTC+7
  for (let i = 0; out.length < count && i < 14; i++) {
    const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate() + i));
    if (d.getUTCDay() === 0) continue;
    out.push({
      iso: d.toISOString().slice(0, 10),
      weekday: i === 0 ? "Hôm nay" : i === 1 ? "Ngày mai" : WEEKDAY[d.getUTCDay()],
      day: `${d.getUTCDate()}/${d.getUTCMonth() + 1}`,
      today: i === 0,
    });
  }
  return out;
}

/** Khung giờ hôm nay đã qua (theo giờ VN) thì không cho chọn. */
function slotPassed(slot: string, isToday: boolean) {
  if (!isToday) return false;
  const [end] = slot.split("-").slice(1);
  const [h, m] = end.split(":").map(Number);
  const now = new Date(Date.now() + 7 * 3600 * 1000);
  return now.getUTCHours() * 60 + now.getUTCMinutes() > h * 60 + m - 30;
}

export default function ConsultationForm() {
  const { openSnackbar } = useSnackbar();
  const session = useAtomValue(sessionAtom);
  const [mode, setMode] = useState<Mode>("consultation");
  const [form, setForm] = useState({ name: "", phone: "", industry: "", note: "" });
  const days = useMemo(() => nextDays(), []);
  const [day, setDay] = useState(days[0]?.iso ?? "");
  const [slot, setSlot] = useState("");
  const [sending, setSending] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  // Chống spam: token lấy lúc mở form (backend kiểm tra thời gian điền) + ô bẫy ẩn
  const [formToken, setFormToken] = useState<string>();
  const [honeypot, setHoneypot] = useState("");
  useEffect(() => {
    fetchFormToken().then(setFormToken);
  }, []);

  // Đăng nhập xong (hoặc mở lại app khi đã đăng nhập) → tự điền họ tên, SĐT nếu ô đang trống
  useEffect(() => {
    if (!session) return;
    setForm((f) => ({
      ...f,
      name: f.name || session.user.name || "",
      phone: f.phone || session.user.phone || "",
    }));
  }, [session]);

  const selectedDay = days.find((d) => d.iso === day);
  useEffect(() => {
    if (slot && slotPassed(slot, !!selectedDay?.today)) setSlot("");
  }, [day]);

  const login = async () => {
    setLoggingIn(true);
    const res = await loginWithZalo();
    setLoggingIn(false);
    if (!res.ok) {
      openSnackbar({ text: res.message, type: res.reason === "denied" ? "info" : "warning" });
      return;
    }
    openSnackbar({ text: res.warning ?? `Xin chào ${res.session.user.name}! Đã điền sẵn thông tin.`, type: res.warning ? "info" : "success" });
  };

  const verified = !!session?.user.phoneVerified && session.user.phone === form.phone.replace(/\s/g, "");

  const submit = async () => {
    const phone = form.phone.replace(/\s/g, "");
    if (!form.name.trim() || !/^0\d{9}$/.test(phone)) {
      openSnackbar({ text: "Vui lòng nhập họ tên và số điện thoại hợp lệ", type: "warning" });
      return;
    }
    if (mode === "callback" && (!day || !slot)) {
      openSnackbar({ text: "Chọn ngày và khung giờ bạn muốn được gọi lại", type: "warning" });
      return;
    }

    setSending(true);
    const res = await submitLead({
      ...form,
      phone,
      requestType: mode,
      ...(mode === "callback" ? { callbackDate: day, callbackSlot: slot } : {}),
      formToken,
      website: honeypot || undefined,
    });
    fetchFormToken().then(setFormToken);
    setSending(false);

    if (res.ok) {
      openSnackbar({
        text:
          mode === "callback"
            ? `Đã đặt lịch! Chúng tôi sẽ gọi ${phone} lúc ${slot}, ${selectedDay?.weekday.toLowerCase()} ${selectedDay?.day}.`
            : "Đã gửi! Chúng tôi sẽ liên hệ bạn sớm.",
        type: "success",
        duration: 5000,
      });
      setForm((f) => ({ ...f, industry: "", note: "" }));
      setSlot("");
      return;
    }
    if (res.reason === "invalid") {
      openSnackbar({ text: res.message ?? "Thông tin chưa hợp lệ", type: "warning" });
      return;
    }
    // Không gửi được về máy chủ → chuyển nội dung sang chat Zalo để không mất yêu cầu
    openSnackbar({ text: "Chưa gửi được qua máy chủ, chuyển sang chat Zalo với chúng tôi…", type: "info" });
    chatWithCompany(
      `${mode === "callback" ? `Đặt lịch gọi lại ${slot} ngày ${selectedDay?.day}` : "Tư vấn Mini App"} – ${form.name.trim()} – ${phone}` +
        (form.industry ? ` – Ngành: ${form.industry}` : "") +
        (form.note.trim() ? ` – ${form.note.trim()}` : ""),
    );
  };

  const input = "w-full rounded-xl bg-gray-50 px-3 py-2.5 text-sm outline-none ring-1 ring-black/5 focus:ring-brand-500";

  return (
    <div className="space-y-3 rounded-2xl bg-white p-4 ring-1 ring-black/5">
      {/* Đăng nhập Zalo để tự điền */}
      {session ? (
        <div className="flex items-center gap-3 rounded-xl bg-brand-50 p-2.5">
          {session.user.avatarUrl ? (
            <img src={session.user.avatarUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
              {session.user.name.slice(0, 1)}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-gray-900">{session.user.name}</div>
            <div className="text-[11px] text-gray-500">
              {session.user.phone ? `SĐT Zalo: ${session.user.phone}` : "Đã đăng nhập Zalo"}
            </div>
          </div>
          <button onClick={() => logout()} className="flex items-center gap-1 text-[11px] text-gray-500" aria-label="Đăng xuất">
            <LuLogOut size={14} /> Thoát
          </button>
        </div>
      ) : (
        <button
          onClick={login}
          disabled={loggingIn}
          className="flex w-full items-center gap-3 rounded-xl bg-[#0068ff] p-2.5 text-left text-white disabled:opacity-70"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[11px] font-black text-[#0068ff]">
            Zalo
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">{loggingIn ? "Đang kết nối Zalo…" : "Đăng nhập bằng Zalo"}</span>
            <span className="block text-[11px] text-white/85">Tự điền họ tên & số điện thoại, không cần gõ</span>
          </span>
        </button>
      )}

      {/* Chọn loại yêu cầu */}
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-gray-100 p-1">
        {(
          [
            { id: "consultation", label: "Nhận tư vấn", icon: <LuMessageSquareText size={15} /> },
            { id: "callback", label: "Đặt lịch gọi lại", icon: <LuCalendarClock size={15} /> },
          ] as const
        ).map((o) => (
          <button
            key={o.id}
            onClick={() => setMode(o.id)}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold ${
              mode === o.id ? "bg-white text-brand-700 shadow-sm" : "text-gray-500"
            }`}
          >
            {o.icon} {o.label}
          </button>
        ))}
      </div>

      <input
        className={input}
        placeholder="Họ và tên *"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
      />
      <div className="relative">
        <input
          className={`${input} ${verified ? "pr-24" : ""}`}
          placeholder="Số điện thoại *"
          inputMode="tel"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
        {verified && (
          <span className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700">
            <LuBadgeCheck size={12} /> Đã xác minh
          </span>
        )}
      </div>

      {mode === "callback" && (
        <div className="space-y-2 rounded-xl bg-gray-50 p-3 ring-1 ring-black/5">
          <div className="text-xs font-semibold text-gray-700">Chọn thời gian bạn tiện nghe máy</div>
          <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1">
            {days.map((d) => (
              <button
                key={d.iso}
                onClick={() => setDay(d.iso)}
                className={`flex min-w-[58px] shrink-0 flex-col items-center rounded-xl border px-2 py-1.5 ${
                  day === d.iso ? "border-brand-600 bg-brand-600 text-white" : "border-gray-200 bg-white text-gray-700"
                }`}
              >
                <span className="text-[10px] font-medium opacity-80">{d.weekday}</span>
                <span className="text-sm font-bold">{d.day}</span>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {CALLBACK_SLOTS.map((s) => {
              const disabled = slotPassed(s, !!selectedDay?.today);
              return (
                <button
                  key={s}
                  disabled={disabled}
                  onClick={() => setSlot(s)}
                  className={`rounded-lg border py-2 text-xs font-semibold ${
                    slot === s
                      ? "border-brand-600 bg-brand-50 text-brand-700"
                      : "border-gray-200 bg-white text-gray-700 disabled:opacity-40"
                  }`}
                >
                  {s.replace("-", " – ")}
                </button>
              );
            })}
          </div>
          <div className="text-[11px] text-gray-500">Chuyên viên sẽ gọi trong khung giờ đã chọn (Thứ 2 – Thứ 7).</div>
        </div>
      )}

      <select className={input} value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })}>
        <option value="">Ngành kinh doanh</option>
        {categories.map((c) => (
          <option key={c.id} value={c.label}>
            {c.label}
          </option>
        ))}
        <option value="Khác">Khác</option>
      </select>
      <textarea
        className={input}
        rows={3}
        placeholder={mode === "callback" ? "Bạn muốn trao đổi về điều gì? (không bắt buộc)" : "Bạn cần Mini App làm gì? (không bắt buộc)"}
        value={form.note}
        onChange={(e) => setForm({ ...form, note: e.target.value })}
      />
      {/* Ô bẫy chống spam — ẩn, người thật không điền */}
      <input
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        name="website"
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
      />
      <button
        onClick={submit}
        disabled={sending}
        className="w-full rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {sending ? "Đang gửi…" : mode === "callback" ? "Đặt lịch gọi lại" : "Gửi yêu cầu tư vấn"}
      </button>
    </div>
  );
}
