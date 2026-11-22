import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Conversation, Message, Prisma } from "@prisma/client";
import type { AuthContext } from "../common/guards/app-auth.guard";
import { NotifyService } from "../notify/notify.service";
import { PortalService } from "../portal/portal.service";
import { PrismaService } from "../prisma/prisma.service";
import { FilesService } from "./files.service";
import { OaCtx, OaService } from "./oa.service";
import { StoreOaService } from "./store-oa.service";

const MAX_TEXT = 2000;
const MAX_CUSTOMER_IMAGES_PER_DAY = 30;

export const previewOf = (kind: string, body?: string | null) => (kind === "image" ? "📷 Ảnh" + (body ? `: ${body}` : "") : (body ?? "")).slice(0, 120);

const isUniqueViolation = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";

const msgInclude = { attachment: true } satisfies Prisma.MessageInclude;
type MessageFull = Prisma.MessageGetPayload<{ include: typeof msgInclude }>;

/**
 * Hộp thư chăm sóc khách: hội thoại hai chiều giữa nhân viên reMini với khách qua Mini App và Zalo OA,
 * kèm ảnh của khách và việc chăm sóc có hẹn.
 */
@Injectable()
export class InboxService {
  private readonly log = new Logger(InboxService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly files: FilesService,
    private readonly oa: OaService,
    private readonly notify: NotifyService,
    private readonly portal: PortalService,
    private readonly storeOa: StoreOaService,
  ) {}

  private view(m: MessageFull) {
    const { attachment, ...rest } = m;
    return { ...rest, image: attachment ? { id: attachment.id, filename: attachment.filename, size: attachment.size, url: this.files.signedUrl(attachment.id) } : null };
  }

  private async label(conv: Pick<Conversation, "customerId" | "displayName">) {
    if (!conv.customerId) return conv.displayName;
    const c = await this.prisma.platformCustomer.findUnique({ where: { id: conv.customerId }, select: { name: true, companyName: true } });
    return c?.companyName || c?.name || conv.displayName;
  }

  // ───────────────────────── Ghi nhận tin của khách ─────────────────────────

  private async upsertConversation(channel: "miniapp" | "oa", externalKey: string, init: { displayName: string; avatarUrl?: string | null; phone?: string | null; customerId?: string | null; storeId?: string }) {
    const existing = await this.prisma.conversation.findUnique({ where: { channel_externalKey: { channel, externalKey } } });
    if (existing) {
      // bổ sung thông tin còn thiếu (không ghi đè tên nhân viên đã sửa)
      const patch: Prisma.ConversationUpdateInput = {};
      if (!existing.customerId && init.customerId) patch.customer = { connect: { id: init.customerId } };
      if (!existing.phone && init.phone) patch.phone = init.phone;
      if (!existing.avatarUrl && init.avatarUrl) patch.avatarUrl = init.avatarUrl;
      return Object.keys(patch).length ? this.prisma.conversation.update({ where: { id: existing.id }, data: patch }) : existing;
    }
    try {
      return await this.prisma.conversation.create({
        data: { channel, externalKey, displayName: init.displayName, avatarUrl: init.avatarUrl, phone: init.phone, customerId: init.customerId, storeId: init.storeId },
      });
    } catch (e) {
      if (isUniqueViolation(e)) return this.prisma.conversation.findUniqueOrThrow({ where: { channel_externalKey: { channel, externalKey } } });
      throw e;
    }
  }

  private async recordIncoming(conv: Conversation, m: { kind: "text" | "image"; body?: string; attachmentId?: string; externalId?: string }) {
    try {
      const msg = await this.prisma.message.create({
        data: { conversationId: conv.id, direction: "in", kind: m.kind, body: m.body, attachmentId: m.attachmentId, externalId: m.externalId },
        include: msgInclude,
      });
      await this.prisma.conversation.update({
        where: { id: conv.id },
        data: { unreadStaff: { increment: 1 }, lastMessageAt: msg.createdAt, lastPreview: previewOf(m.kind, m.body), status: "open" },
      });
      // hộp thư OA riêng của gian hàng: không báo nhân viên reMini
      if (!conv.storeId) this.notify.notify({ type: "message.created", channel: conv.channel, from: await this.label(conv), preview: previewOf(m.kind, m.body) });
      return msg;
    } catch (e) {
      if (isUniqueViolation(e)) return null; // webhook gửi lặp
      throw e;
    }
  }

  // ───────────────────────── Khách trong Mini App ─────────────────────────

  private async miniappConversation(auth: AuthContext) {
    if (!auth.userId) throw new ForbiddenException("Vui lòng đăng nhập Zalo");
    const user = await this.prisma.user.findUnique({ where: { id: auth.userId }, select: { name: true, phone: true, avatarUrl: true } });
    if (!user) throw new ForbiddenException("Tài khoản không hợp lệ");
    const customerId = await this.portal.resolveCustomerId(auth);
    return this.upsertConversation("miniapp", auth.userId, { displayName: user.name, avatarUrl: user.avatarUrl, phone: user.phone, customerId });
  }

  async customerThread(auth: AuthContext, after?: string) {
    const conv = await this.miniappConversation(auth);
    const since = after ? new Date(after) : undefined;
    const hasSince = !!since && !isNaN(+since);
    // Lần đầu lấy 200 tin MỚI NHẤT (rồi đảo lại cho đúng thứ tự); các lần sau chỉ lấy tin sau mốc `after`
    const found = await this.prisma.message.findMany({
      where: { conversationId: conv.id, direction: { not: "note" }, ...(hasSince ? { createdAt: { gt: since } } : {}) },
      include: msgInclude,
      orderBy: { createdAt: hasSince ? "asc" : "desc" },
      take: 200,
    });
    const rows = hasSince ? found : found.reverse();
    if (conv.unreadCustomer) await this.prisma.conversation.update({ where: { id: conv.id }, data: { unreadCustomer: 0 } });
    return {
      messages: rows.map((m) => {
        const v = this.view(m);
        return { id: v.id, from: v.direction === "in" ? "me" : "staff", kind: v.kind, body: v.body, image: v.image ? { url: v.image.url } : null, createdAt: v.createdAt };
      }),
    };
  }

  async customerUnread(auth: AuthContext) {
    if (!auth.userId) return { count: 0 };
    const c = await this.prisma.conversation.findUnique({ where: { channel_externalKey: { channel: "miniapp", externalKey: auth.userId } }, select: { unreadCustomer: true } });
    return { count: c?.unreadCustomer ?? 0 };
  }

  async customerSend(auth: AuthContext, input: { body?: string; file?: Express.Multer.File }) {
    const body = input.body?.trim();
    if (!body && !input.file) throw new BadRequestException("Nhập nội dung hoặc chọn ảnh");
    if (body && body.length > MAX_TEXT) throw new BadRequestException(`Tin nhắn tối đa ${MAX_TEXT} ký tự`);
    const conv = await this.miniappConversation(auth);

    let attachmentId: string | undefined;
    if (input.file) {
      const today = await this.prisma.attachment.count({ where: { conversationId: conv.id, source: "customer", createdAt: { gt: new Date(Date.now() - 24 * 3600e3) } } });
      if (today >= MAX_CUSTOMER_IMAGES_PER_DAY) throw new BadRequestException("Bạn đã gửi quá nhiều ảnh hôm nay, vui lòng thử lại ngày mai");
      const a = await this.files.save(input.file.buffer, input.file.originalname, { customerId: conv.customerId, conversationId: conv.id, source: "customer" });
      attachmentId = a.id;
    }
    const msg = await this.recordIncoming(conv, { kind: attachmentId ? "image" : "text", body, attachmentId });
    const v = msg && this.view(msg);
    return v && { id: v.id, from: "me", kind: v.kind, body: v.body, image: v.image ? { url: v.image.url } : null, createdAt: v.createdAt };
  }

  // ───────────────────────── Zalo OA (webhook) ─────────────────────────

  /** Xử lý một sự kiện webhook đã được xác thực chữ ký. Không ném lỗi ra ngoài (Zalo sẽ gửi lại liên tục). */
  async handleOaEvent(payload: Record<string, unknown>, scope?: { storeId: string; ctx: OaCtx }): Promise<void> {
    try {
      const name = String(payload.event_name ?? "");
      const sender = (payload.sender as { id?: string } | undefined)?.id;
      const recipient = (payload.recipient as { id?: string } | undefined)?.id;
      const message = (payload.message ?? {}) as { text?: string; msg_id?: string; attachments?: { type?: string; payload?: { url?: string; thumbnail?: string } }[] };

      if (name === "follow" || name.startsWith("user_send_")) {
        if (!sender) return;
        const conv = await this.oaConversation(sender, scope);
        if (name === "follow") return;
        if (name === "user_send_text") {
          if (message.text?.trim()) await this.recordIncoming(conv, { kind: "text", body: message.text.trim().slice(0, MAX_TEXT), externalId: message.msg_id });
          return;
        }
        if (name === "user_send_image") {
          const imgs = (message.attachments ?? []).filter((a) => a.type === "image" && a.payload?.url);
          for (const [i, a] of imgs.entries()) {
            const eid = message.msg_id ? `${message.msg_id}#${i}` : undefined;
            try {
              const att = await this.files.saveFromUrl(a.payload!.url!, { customerId: conv.customerId, conversationId: conv.id, source: "customer" });
              await this.recordIncoming(conv, { kind: "image", body: i === 0 ? message.text?.trim() : undefined, attachmentId: att.id, externalId: eid });
            } catch (e) {
              this.log.warn(`Không lưu được ảnh OA: ${e instanceof Error ? e.message : e}`);
              await this.recordIncoming(conv, { kind: "text", body: "[Khách gửi ảnh nhưng không tải được — xem trong Zalo OA]", externalId: eid });
            }
          }
          return;
        }
        // sticker, file, vị trí…: ghi dấu để nhân viên biết mà mở Zalo OA xem
        await this.recordIncoming(conv, { kind: "text", body: `[Khách gửi nội dung không hỗ trợ: ${name.replace("user_send_", "")}]`, externalId: message.msg_id });
        return;
      }

      // Nhân viên trả lời trực tiếp trong ứng dụng Zalo OA → đồng bộ vào hộp thư
      if (name.startsWith("oa_send_") && recipient && message.msg_id) {
        const conv = await this.oaConversation(recipient, scope);
        const text = message.text?.trim();
        if (!text) return;
        const exists = await this.prisma.message.findFirst({ where: { conversationId: conv.id, externalId: message.msg_id } });
        if (exists) return;
        await this.prisma.message.create({ data: { conversationId: conv.id, direction: "out", kind: "text", body: text, staffLabel: "Zalo OA", externalId: message.msg_id } });
        await this.prisma.conversation.update({ where: { id: conv.id }, data: { lastMessageAt: new Date(), lastPreview: previewOf("text", text) } });
      }
    } catch (e) {
      this.log.error(`Xử lý sự kiện OA lỗi: ${e instanceof Error ? e.message : e}`);
    }
  }

  /** externalKey của hội thoại OA: id người dùng OA; với gian hàng thì thêm tiền tố `<storeId>:` (id OA chỉ duy nhất trong từng OA). */
  private oaKey(oaUserId: string, storeId?: string | null) {
    return storeId ? `${storeId}:${oaUserId}` : oaUserId;
  }

  private oaUserOf(conv: Pick<Conversation, "externalKey" | "storeId">) {
    return conv.storeId ? conv.externalKey.slice(conv.storeId.length + 1) : conv.externalKey;
  }

  private async oaConversation(oaUserId: string, scope?: { storeId: string; ctx: OaCtx }) {
    const externalKey = this.oaKey(oaUserId, scope?.storeId);
    const existing = await this.prisma.conversation.findUnique({ where: { channel_externalKey: { channel: "oa", externalKey } } });
    if (existing) return existing;
    const p = await this.oa.profile(oaUserId, scope?.ctx);
    return this.upsertConversation("oa", externalKey, { displayName: p?.name || "Khách Zalo OA", avatarUrl: p?.avatar, storeId: scope?.storeId });
  }

  // ───────────────────────── Nhân viên (web quản trị) ─────────────────────────

  async summary() {
    const [unread, open] = await Promise.all([
      this.prisma.conversation.aggregate({ _sum: { unreadStaff: true }, where: { status: "open", storeId: null } }),
      this.prisma.conversation.count({ where: { status: "open", storeId: null } }),
    ]);
    const careDue = await this.prisma.careTask.count({ where: { doneAt: null, dueAt: { lte: new Date() } } });
    return { unread: unread._sum.unreadStaff ?? 0, open, careDue };
  }

  /** storeId = null → hộp thư reMini; có giá trị → hộp thư OA của gian hàng đó. */
  async list(opts: { status?: string; channel?: string; q?: string; customerId?: string }, storeId: string | null = null) {
    const q = opts.q?.trim();
    return this.prisma.conversation.findMany({
      where: {
        storeId: storeId ?? null,
        status: opts.status || undefined,
        channel: opts.channel || undefined,
        customerId: opts.customerId || undefined,
        ...(q ? { OR: [{ displayName: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }, { lastPreview: { contains: q, mode: "insensitive" } }] } : {}),
      },
      include: { customer: { select: { id: true, name: true, companyName: true } } },
      orderBy: { lastMessageAt: "desc" },
      take: 200,
    });
  }

  /** Hội thoại phải thuộc đúng hộp thư (reMini hoặc gian hàng) — chặn truy cập chéo. */
  private async owned(id: string, storeId: string | null) {
    const conv = await this.prisma.conversation.findUnique({ where: { id } });
    if (!conv || conv.storeId !== storeId) throw new NotFoundException("Không tìm thấy hội thoại");
    return conv;
  }

  async get(id: string, storeId: string | null = null) {
    await this.owned(id, storeId);
    const conv = await this.prisma.conversation.findUnique({
      where: { id },
      include: { customer: { select: { id: true, name: true, companyName: true, phone: true } } },
    });
    if (!conv) throw new NotFoundException("Không tìm thấy hội thoại");
    const rows = (await this.prisma.message.findMany({ where: { conversationId: id }, include: msgInclude, orderBy: { createdAt: "desc" }, take: 500 })).reverse();
    if (conv.unreadStaff) await this.prisma.conversation.update({ where: { id }, data: { unreadStaff: 0 } });
    return { ...conv, unreadStaff: 0, messages: rows.map((m) => this.view(m)) };
  }

  /** Gửi tin cho khách. Tin gửi OA thất bại vẫn được lưu (delivery=failed + lý do) để nhân viên thấy và xử lý. */
  async staffSend(id: string, staffLabel: string, input: { body?: string; internal?: boolean; file?: Express.Multer.File }, storeId: string | null = null): Promise<Message> {
    const conv = await this.owned(id, storeId);
    const body = input.body?.trim();
    if (!body && !input.file) throw new BadRequestException("Nhập nội dung hoặc chọn ảnh");
    if (body && body.length > MAX_TEXT) throw new BadRequestException(`Tin nhắn tối đa ${MAX_TEXT} ký tự`);
    if (input.internal && input.file) throw new BadRequestException("Ghi chú nội bộ chỉ gồm chữ");

    let attachmentId: string | undefined;
    let imageUrl: string | undefined;
    if (input.file) {
      const a = await this.files.save(input.file.buffer, input.file.originalname, { customerId: conv.customerId, conversationId: id, source: "staff" });
      attachmentId = a.id;
      imageUrl = this.files.signedUrl(a.id, 600); // Zalo tải ảnh ngay, 10 phút là đủ
    }
    const kind = attachmentId ? "image" : "text";

    let delivery = "sent";
    let error: string | undefined;
    let externalId: string | undefined;
    if (!input.internal && conv.channel === "oa") {
      try {
        const ctx = conv.storeId ? await this.storeOa.ctx(conv.storeId) : undefined;
        const to = this.oaUserOf(conv);
        externalId = attachmentId ? await this.oa.sendImage(to, imageUrl!, body, ctx) : await this.oa.sendText(to, body!, ctx);
      } catch (e) {
        delivery = "failed";
        error = e instanceof Error ? e.message : "Gửi thất bại";
      }
    }

    const msg = await this.prisma.message.create({
      data: { conversationId: id, direction: input.internal ? "note" : "out", kind, body, attachmentId, staffLabel, externalId, delivery, error },
      include: msgInclude,
    });
    if (!input.internal) {
      await this.prisma.conversation.update({
        where: { id },
        data: { lastMessageAt: msg.createdAt, lastPreview: previewOf(kind, body), ...(conv.channel === "miniapp" ? { unreadCustomer: { increment: 1 } } : {}) },
      });
    }
    return this.view(msg) as unknown as Message;
  }

  async update(id: string, dto: { status?: string; customerId?: string | null; displayName?: string }, storeId: string | null = null) {
    await this.owned(id, storeId);
    if (dto.status && !["open", "closed"].includes(dto.status)) throw new BadRequestException("Trạng thái không hợp lệ");
    if (dto.customerId && storeId) throw new BadRequestException("Hội thoại của gian hàng không gắn với khách hàng reMini");
    if (dto.customerId) {
      const c = await this.prisma.platformCustomer.findUnique({ where: { id: dto.customerId }, select: { id: true } });
      if (!c) throw new NotFoundException("Không tìm thấy khách hàng");
    }
    const updated = await this.prisma.conversation.update({
      where: { id },
      data: {
        status: dto.status,
        displayName: dto.displayName?.trim() || undefined,
        customerId: dto.customerId === undefined ? undefined : dto.customerId || null,
      },
    });
    // gắn khách → toàn bộ ảnh của hội thoại cũng thuộc khách đó
    if (dto.customerId !== undefined) await this.prisma.attachment.updateMany({ where: { conversationId: id }, data: { customerId: dto.customerId || null } });
    return updated;
  }

  // ───────────────────────── Thư viện ảnh khách ─────────────────────────

  async gallery(opts: { customerId?: string; conversationId?: string; tag?: string; source?: string; q?: string }) {
    const q = opts.q?.trim();
    const rows = await this.prisma.attachment.findMany({
      where: {
        // chỉ ảnh của hộp thư reMini (ảnh của hộp thư gian hàng không lộ ra đây)
        AND: [{ OR: [{ conversationId: null }, { conversation: { storeId: null } }] }],
        customerId: opts.customerId || undefined,
        conversationId: opts.conversationId || undefined,
        tag: opts.tag || undefined,
        source: opts.source || undefined,
        ...(q ? { OR: [{ filename: { contains: q, mode: "insensitive" } }, { note: { contains: q, mode: "insensitive" } }, { tag: { contains: q, mode: "insensitive" } }] } : {}),
      },
      include: { customer: { select: { id: true, name: true, companyName: true } }, conversation: { select: { id: true, displayName: true, channel: true } } },
      orderBy: { createdAt: "desc" },
      take: 300,
    });
    return rows.map((a) => this.files.withUrl(a));
  }

  async updateAttachment(id: string, dto: { tag?: string; note?: string; customerId?: string | null }) {
    const a = await this.prisma.attachment.findUnique({ where: { id } });
    if (!a) throw new NotFoundException("Không tìm thấy ảnh");
    const updated = await this.prisma.attachment.update({
      where: { id },
      data: {
        tag: dto.tag === undefined ? undefined : dto.tag.trim().slice(0, 40) || null,
        note: dto.note === undefined ? undefined : dto.note.trim().slice(0, 300) || null,
        customerId: dto.customerId === undefined ? undefined : dto.customerId || null,
      },
    });
    return this.files.withUrl(updated);
  }

  async uploadForCustomer(customerId: string, file: Express.Multer.File, tag?: string, note?: string) {
    const c = await this.prisma.platformCustomer.findUnique({ where: { id: customerId }, select: { id: true } });
    if (!c) throw new NotFoundException("Không tìm thấy khách hàng");
    const a = await this.files.save(file?.buffer, file?.originalname, { customerId, source: "staff", tag, note });
    return this.files.withUrl(a);
  }

  // ───────────────────────── Việc chăm sóc ─────────────────────────

  careList(opts: { status?: string; customerId?: string }) {
    return this.prisma.careTask.findMany({
      where: {
        customerId: opts.customerId || undefined,
        ...(opts.status === "done" ? { doneAt: { not: null } } : opts.status === "open" ? { doneAt: null } : {}),
      },
      include: { customer: { select: { id: true, name: true, companyName: true, phone: true } }, conversation: { select: { id: true, displayName: true, channel: true } } },
      orderBy: [{ doneAt: { sort: "asc", nulls: "first" } }, { dueAt: "asc" }],
      take: 300,
    });
  }

  async careCreate(dto: { title: string; dueAt: string; note?: string; customerId?: string; conversationId?: string }, by: string) {
    const dueAt = new Date(dto.dueAt);
    if (isNaN(+dueAt)) throw new BadRequestException("Thời hạn không hợp lệ");
    let customerId = dto.customerId || null;
    if (dto.conversationId) {
      const conv = await this.prisma.conversation.findUnique({ where: { id: dto.conversationId }, select: { customerId: true, storeId: true } });
      if (!conv || conv.storeId) throw new NotFoundException("Không tìm thấy hội thoại");
      customerId ??= conv.customerId;
    }
    if (!customerId && !dto.conversationId) throw new BadRequestException("Chọn khách hàng hoặc hội thoại cần chăm sóc");
    return this.prisma.careTask.create({
      data: { title: dto.title.trim(), note: dto.note?.trim() || null, dueAt, customerId, conversationId: dto.conversationId || null, createdBy: by },
    });
  }

  async careUpdate(id: string, dto: { title?: string; note?: string; dueAt?: string; done?: boolean }) {
    const t = await this.prisma.careTask.findUnique({ where: { id } });
    if (!t) throw new NotFoundException("Không tìm thấy việc chăm sóc");
    const dueAt = dto.dueAt ? new Date(dto.dueAt) : undefined;
    if (dueAt && isNaN(+dueAt)) throw new BadRequestException("Thời hạn không hợp lệ");
    return this.prisma.careTask.update({
      where: { id },
      data: {
        title: dto.title?.trim() || undefined,
        note: dto.note === undefined ? undefined : dto.note.trim() || null,
        dueAt,
        // đổi hạn → nhắc lại
        remindedAt: dueAt ? null : undefined,
        doneAt: dto.done === undefined ? undefined : dto.done ? new Date() : null,
      },
    });
  }

  async careDelete(id: string) {
    const t = await this.prisma.careTask.findUnique({ where: { id } });
    if (!t) throw new NotFoundException("Không tìm thấy việc chăm sóc");
    await this.prisma.careTask.delete({ where: { id } });
    return { deleted: true };
  }
}
