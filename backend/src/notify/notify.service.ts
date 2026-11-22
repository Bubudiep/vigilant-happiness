import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export type NotifyEvent =
  | { type: "lead.created"; name: string; phone: string; verified: boolean; industry?: string | null; templateId?: string | null; note?: string | null }
  | { type: "callback.created"; name: string; phone: string; verified: boolean; date: string; slot: string; note?: string | null }
  | { type: "callback.reminder"; name: string; phone: string; slot: string; note?: string | null }
  | { type: "ticket.created"; code: string; subject: string; customer: string; category: string }
  | { type: "ticket.customer_reply"; code: string; subject: string; customer: string; body: string }
  | { type: "message.created"; channel: string; from: string; preview: string }
  | { type: "care.due"; title: string; customer: string; note?: string | null }
  | { type: "build.requested"; store: string; customer: string; appName?: string | null };

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const cut = (s: string | null | undefined, n = 200) => (s && s.length > n ? s.slice(0, n) + "…" : (s ?? ""));

/**
 * Gửi thông báo cho nhân viên reMini. Kênh bật theo biến môi trường, bật được nhiều kênh cùng lúc:
 *  - Telegram: TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID (nhóm hoặc người nhận)
 *  - Webhook chung: NOTIFY_WEBHOOK_URL (POST JSON {event, text, data}) — nối n8n / Zapier / Zalo OA...
 * Không bao giờ ném lỗi: thông báo hỏng không được làm hỏng request của khách.
 */
@Injectable()
export class NotifyService {
  private readonly log = new Logger(NotifyService.name);

  constructor(private readonly config: ConfigService) {}

  private adminLink(section: string) {
    const base = (this.config.get<string>("FRONTEND_URL") ?? "").replace(/\/+$/, "");
    return base ? `${base}/admin/${section}` : "";
  }

  format(e: NotifyEvent): { html: string; text: string } {
    const lines: string[] = [];
    let link = "";
    switch (e.type) {
      case "lead.created":
        lines.push("📩 <b>Yêu cầu tư vấn mới</b>", `${esc(e.name)} · <code>${e.phone}</code>${e.verified ? " ✅ Zalo xác minh" : ""}`);
        if (e.industry) lines.push(`Ngành: ${esc(e.industry)}`);
        if (e.templateId) lines.push(`Mẫu quan tâm: ${esc(e.templateId)}`);
        if (e.note) lines.push(`“${esc(cut(e.note))}”`);
        link = this.adminLink("callbacks");
        break;
      case "callback.created":
        lines.push(
          "📞 <b>Khách đặt lịch gọi lại</b>",
          `${esc(e.name)} · <code>${e.phone}</code>${e.verified ? " ✅ Zalo xác minh" : ""}`,
          `🕒 ${e.date} · ${e.slot.replace("-", " – ")}`,
        );
        if (e.note) lines.push(`“${esc(cut(e.note))}”`);
        link = this.adminLink("callbacks");
        break;
      case "callback.reminder":
        lines.push("⏰ <b>Sắp đến giờ gọi lại</b>", `${esc(e.name)} · <code>${e.phone}</code>`, `Khung giờ: ${e.slot.replace("-", " – ")}`);
        if (e.note) lines.push(`“${esc(cut(e.note))}”`);
        link = this.adminLink("callbacks");
        break;
      case "ticket.created":
        lines.push(`🎫 <b>Ticket mới ${e.code}</b>`, esc(e.subject), `${esc(e.customer)} · ${esc(e.category)}`);
        link = this.adminLink("portal");
        break;
      case "ticket.customer_reply":
        lines.push(`💬 <b>Khách trả lời ${e.code}</b>`, esc(e.subject), `${esc(e.customer)}: “${esc(cut(e.body))}”`);
        link = this.adminLink("portal");
        break;
      case "message.created":
        lines.push(`💬 <b>Tin nhắn mới (${e.channel === "oa" ? "Zalo OA" : "Mini App"})</b>`, `${esc(e.from)}: “${esc(cut(e.preview))}”`);
        link = this.adminLink("inbox");
        break;
      case "care.due":
        lines.push("🤝 <b>Đến hạn chăm sóc khách</b>", esc(e.title), esc(e.customer));
        if (e.note) lines.push(`“${esc(cut(e.note))}”`);
        link = this.adminLink("care");
        break;
      case "build.requested":
        lines.push("🛠 <b>Yêu cầu build Mini App riêng</b>", esc(e.store), esc(e.customer));
        if (e.appName) lines.push(`Tên app: ${esc(e.appName)}`);
        link = this.adminLink("builds");
        break;
    }
    if (link) lines.push(link);
    const html = lines.join("\n");
    const text = html.replace(/<[^>]+>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
    return { html, text };
  }

  /** Gọi không cần await. */
  notify(e: NotifyEvent): void {
    void this.send(e).catch((err) => this.log.warn(`Gửi thông báo lỗi: ${err instanceof Error ? err.message : err}`));
  }

  async send(e: NotifyEvent): Promise<{ telegram: boolean; webhook: boolean }> {
    const { html, text } = this.format(e);
    const token = this.config.get<string>("TELEGRAM_BOT_TOKEN");
    const chat = this.config.get<string>("TELEGRAM_CHAT_ID");
    const hook = this.config.get<string>("NOTIFY_WEBHOOK_URL");
    const result = { telegram: false, webhook: false };

    const tasks: Promise<void>[] = [];
    if (token && chat) {
      tasks.push(
        fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chat, text: html, parse_mode: "HTML", disable_web_page_preview: true }),
          signal: AbortSignal.timeout(8000),
        }).then(async (r) => {
          if (!r.ok) throw new Error(`Telegram ${r.status}: ${(await r.text()).slice(0, 120)}`);
          result.telegram = true;
        }),
      );
    }
    if (hook) {
      tasks.push(
        fetch(hook, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event: e.type, text, data: e }),
          signal: AbortSignal.timeout(8000),
        }).then((r) => {
          if (!r.ok) throw new Error(`Webhook ${r.status}`);
          result.webhook = true;
        }),
      );
    }
    const settled = await Promise.allSettled(tasks);
    settled.forEach((s) => s.status === "rejected" && this.log.warn(String(s.reason)));
    return result;
  }
}
