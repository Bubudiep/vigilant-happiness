import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import * as fs from "fs";
import { NotifyService } from "../notify/notify.service";
import { PrismaService } from "../prisma/prisma.service";

const REMIND_BEFORE_MIN = 15;
const DAY = 24 * 3600 * 1000;

/** "10:00-12:00" → [600, 720] (phút trong ngày). */
export function parseSlot(slot: string): [number, number] | null {
  const m = slot.match(/^(\d{2}):(\d{2})-(\d{2}):(\d{2})$/);
  if (!m) return null;
  return [Number(m[1]) * 60 + Number(m[2]), Number(m[3]) * 60 + Number(m[4])];
}

/**
 * Lịch gọi lại cần nhắc ngay bây giờ?
 * `dayStartUtc` = 00:00 giờ VN của ngày hẹn (đúng như LeadsService lưu). Nhắc khi còn ≤ 15 phút
 * tới giờ bắt đầu và khung giờ chưa kết thúc.
 */
export function shouldRemind(dayStartUtc: Date, slot: string, now: number): boolean {
  const range = parseSlot(slot);
  if (!range) return false;
  const start = dayStartUtc.getTime() + range[0] * 60000;
  const end = dayStartUtc.getTime() + range[1] * 60000;
  return now >= start - REMIND_BEFORE_MIN * 60000 && now < end;
}

export const DISK_WARN_PCT = 80;
export const DISK_CRITICAL_PCT = 90;
/** Mỗi mức cảnh báo tối đa 1 lần / 12 giờ. */
export const DISK_ALERT_COOLDOWN_MS = 12 * 3600 * 1000;

/** Mức cảnh báo theo % ổ đã dùng; null = bình thường. */
export function diskLevel(usedPct: number): "warn" | "critical" | null {
  if (usedPct >= DISK_CRITICAL_PCT) return "critical";
  if (usedPct >= DISK_WARN_PCT) return "warn";
  return null;
}

/** Có nên gửi cảnh báo mức này lúc `now` không (chưa gửi bao giờ, hoặc đã quá 12h kể từ lần gửi trước)? */
export function shouldAlertDisk(lastSentAt: number | undefined, now: number): boolean {
  return lastSentAt === undefined || now - lastSentAt >= DISK_ALERT_COOLDOWN_MS;
}

@Injectable()
export class JobsService {
  private readonly log = new Logger(JobsService.name);
  private running = new Set<string>();
  /** Lần cuối gửi cảnh báo ổ theo mức (trong bộ nhớ — khởi động lại sẽ nhắc lại, chấp nhận được). */
  private diskAlertAt: Partial<Record<"warn" | "critical", number>> = {};

  constructor(
    private readonly prisma: PrismaService,
    private readonly notify: NotifyService,
  ) {}

  /** Tránh chạy chồng khi một lần chạy kéo dài hơn chu kỳ. */
  private async once(name: string, fn: () => Promise<void>) {
    if (this.running.has(name)) return;
    this.running.add(name);
    try {
      await fn();
    } catch (e) {
      this.log.error(`${name}: ${e instanceof Error ? e.message : e}`);
    } finally {
      this.running.delete(name);
    }
  }

  /** Mỗi phút: nhắc nhân viên các cuộc gọi lại sắp đến giờ. */
  @Cron(CronExpression.EVERY_MINUTE)
  remindCallbacks() {
    return this.once("remindCallbacks", async () => {
      const now = Date.now();
      // callbackDate lưu 00:00 giờ VN → lấy các lịch trong khoảng hôm qua..mai là đủ
      const leads = await this.prisma.consultationLead.findMany({
        where: {
          requestType: "callback",
          status: "NEW",
          remindedAt: null,
          spamScore: { lt: 40 },
          callbackDate: { gte: new Date(now - DAY), lte: new Date(now + DAY) },
        },
        take: 100,
      });
      for (const l of leads) {
        if (!l.callbackDate || !l.callbackSlot || !shouldRemind(l.callbackDate, l.callbackSlot, now)) continue;
        // Đánh dấu trước (có điều kiện) để 2 instance không cùng nhắc 1 lịch
        const claimed = await this.prisma.consultationLead.updateMany({
          where: { id: l.id, remindedAt: null },
          data: { remindedAt: new Date() },
        });
        if (!claimed.count) continue;
        this.notify.notify({ type: "callback.reminder", name: l.name, phone: l.phone, slot: l.callbackSlot, note: l.note });
      }
    });
  }

  /** Mỗi phút: nhắc các việc chăm sóc khách đã đến hạn (mỗi việc một lần; đổi hạn thì nhắc lại). */
  @Cron(CronExpression.EVERY_MINUTE)
  remindCare() {
    return this.once("remindCare", async () => {
      const due = await this.prisma.careTask.findMany({
        where: { doneAt: null, remindedAt: null, dueAt: { lte: new Date() } },
        include: { customer: { select: { name: true, companyName: true } }, conversation: { select: { displayName: true } } },
        take: 50,
      });
      for (const t of due) {
        const claimed = await this.prisma.careTask.updateMany({ where: { id: t.id, remindedAt: null }, data: { remindedAt: new Date() } });
        if (!claimed.count) continue;
        const who = t.customer?.companyName || t.customer?.name || t.conversation?.displayName || "Khách hàng";
        this.notify.notify({ type: "care.due", title: t.title, customer: who, note: t.note });
      }
    });
  }

  /** Mỗi giờ: cảnh báo ổ chứa uploads ≥ 80% (cảnh báo) / ≥ 90% (khẩn); mỗi mức tối đa 1 lần / 12 giờ. */
  @Cron(CronExpression.EVERY_HOUR)
  checkDisk() {
    return this.once("checkDisk", async () => {
      const s = await fs.promises.statfs(process.cwd());
      const total = Number(s.blocks) * Number(s.bsize);
      const free = Number(s.bavail) * Number(s.bsize);
      if (!total) return;
      const usedPct = ((total - free) / total) * 100;
      const level = diskLevel(usedPct);
      if (!level) return;
      const now = Date.now();
      if (!shouldAlertDisk(this.diskAlertAt[level], now)) return;
      this.diskAlertAt[level] = now;
      this.log.warn(`Ổ đĩa đã dùng ${usedPct.toFixed(1)}% (${level})`);
      this.notify.notify({ type: "disk.warning", level, usedPct, freeBytes: free, totalBytes: total });
    });
  }

  /** 3:15 sáng mỗi ngày: xoá dữ liệu hết hạn. */
  @Cron("15 3 * * *", { timeZone: "Asia/Ho_Chi_Minh" })
  cleanup() {
    return this.once("cleanup", async () => {
      const ago = (days: number) => new Date(Date.now() - days * DAY);
      const [at, rt, ev, bl] = await Promise.all([
        this.prisma.oAuthAccessToken.deleteMany({ where: { OR: [{ expiresAt: { lt: ago(30) } }, { revokedAt: { lt: ago(30) } }] } }),
        this.prisma.oAuthRefreshToken.deleteMany({ where: { OR: [{ expiresAt: { lt: ago(30) } }, { revokedAt: { lt: ago(30) } }] } }),
        this.prisma.spamEvent.deleteMany({ where: { createdAt: { lt: ago(90) } } }),
        this.prisma.spamBlock.deleteMany({ where: { expiresAt: { lt: ago(30) } } }),
      ]);
      this.log.log(`Dọn dữ liệu: ${at.count} access token, ${rt.count} refresh token, ${ev.count} nhật ký spam, ${bl.count} mục chặn hết hạn`);
    });
  }
}
