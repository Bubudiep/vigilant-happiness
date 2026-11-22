import { useSetAtom } from "jotai";
import { useCallback, useEffect, useRef, useState } from "react";
import { LuImagePlus, LuSend, LuX } from "react-icons/lu";
import { Spinner, useSnackbar } from "zmp-ui";

import { Sheet } from "@/components/back-aware";
import { company } from "@/data/company";
import { ChatMessage, fetchMessages, PortalError, sendChatMessage, unreadMessagesAtom } from "@/utils/portal-api";

const POLL_MS = 6000;
const MAX_SIDE = 1600;

const fmtTime = (s: string) => new Date(s).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });

/** Thu nhỏ ảnh chụp từ điện thoại (thường 3–8MB) trước khi gửi; lỗi thì gửi ảnh gốc. */
async function shrink(file: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
    if (scale === 1 && file.size < 1.5 * 1024 * 1024 && file.type === "image/jpeg") return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    return blob ?? file;
  } catch {
    return file;
  }
}

/** Khung nhắn tin với nhân viên reMini (cùng hộp thư với Zalo OA ở web quản trị). */
export function MessagesSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { openSnackbar } = useSnackbar();
  const setUnread = useSetAtom(unreadMessagesAtom);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [text, setText] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const lastRef = useRef<string | undefined>(undefined);

  const refresh = useCallback(async () => {
    try {
      const r = await fetchMessages(lastRef.current);
      if (r.messages.length) {
        lastRef.current = r.messages[r.messages.length - 1].createdAt;
        setMessages((cur) => {
          const seen = new Set(cur.map((m) => m.id));
          return [...cur, ...r.messages.filter((m) => !seen.has(m.id))];
        });
      }
      setUnread(0);
    } catch (e) {
      if (!loaded) openSnackbar({ text: e instanceof PortalError ? e.message : "Không tải được tin nhắn", type: "warning" });
    } finally {
      setLoaded(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setUnread, openSnackbar]);

  // Mở khung: tải toàn bộ rồi hỏi tin mới mỗi vài giây; đóng khung thì dừng
  useEffect(() => {
    if (!visible) return;
    lastRef.current = undefined;
    setMessages([]);
    setLoaded(false);
    refresh();
    const t = setInterval(refresh, POLL_MS);
    return () => clearInterval(t);
  }, [visible, refresh]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, loaded]);

  useEffect(() => {
    if (!image) return setPreview(null);
    const url = URL.createObjectURL(image);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  const send = async () => {
    if (busy || (!text.trim() && !image)) return;
    setBusy(true);
    try {
      const blob = image ? await shrink(image) : null;
      const m = await sendChatMessage({ body: text.trim(), image: blob });
      if (m) {
        setMessages((cur) => (cur.some((x) => x.id === m.id) ? cur : [...cur, m]));
        lastRef.current = m.createdAt;
      }
      setText("");
      setImage(null);
    } catch (e) {
      openSnackbar({ text: e instanceof PortalError ? e.message : "Gửi không được, vui lòng thử lại", type: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} mask handler swipeToClose height="85vh">
      <div className="flex h-full flex-col px-4 pb-3 safe-bottom">
        <div className="border-b border-gray-100 pb-2 text-sm font-bold text-gray-900">
          Nhắn tin với {company.name}
          <div className="text-[11px] font-normal text-gray-400">Chúng tôi trả lời trong giờ làm việc</div>
        </div>
        <div className="flex-1 space-y-2.5 overflow-y-auto py-3">
          {!loaded ? (
            <div className="flex justify-center py-10">
              <Spinner visible />
            </div>
          ) : messages.length === 0 ? (
            <div className="py-10 text-center text-xs text-gray-400">Hãy gửi câu hỏi hoặc hình ảnh logo, sản phẩm — chúng tôi sẽ phản hồi sớm.</div>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={`flex ${m.from === "me" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm ${m.from === "me" ? "rounded-br-sm bg-brand-600 text-white" : "rounded-bl-sm bg-gray-100 text-gray-800"}`}>
                  {m.image && <img src={m.image.url} alt="Ảnh" className="mb-1 max-h-60 rounded-xl object-cover" loading="lazy" />}
                  {m.body && <div className="whitespace-pre-wrap break-words">{m.body}</div>}
                  <div className={`mt-0.5 text-[10px] ${m.from === "me" ? "text-white/70" : "text-gray-400"}`}>{fmtTime(m.createdAt)}</div>
                </div>
              </div>
            ))
          )}
          <div ref={endRef} />
        </div>
        {preview && (
          <div className="mb-2 flex items-center gap-2">
            <img src={preview} alt="" className="h-14 w-14 rounded-lg object-cover" />
            <button onClick={() => setImage(null)} className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100" aria-label="Bỏ ảnh">
              <LuX size={13} />
            </button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f && f.type.startsWith("image/")) setImage(f);
            }}
          />
          <button onClick={() => fileRef.current?.click()} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-50 text-gray-600 ring-1 ring-black/5" aria-label="Gửi ảnh">
            <LuImagePlus size={18} />
          </button>
          <textarea
            rows={1}
            maxLength={2000}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Nhập tin nhắn…"
            className="max-h-28 flex-1 resize-none rounded-xl bg-gray-50 px-3 py-2.5 text-sm outline-none ring-1 ring-black/5"
          />
          <button
            onClick={send}
            disabled={busy || (!text.trim() && !image)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white disabled:opacity-40"
            aria-label="Gửi"
          >
            <LuSend size={16} />
          </button>
        </div>
      </div>
    </Sheet>
  );
}
