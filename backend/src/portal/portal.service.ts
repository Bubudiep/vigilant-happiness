import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { randomBytes } from "crypto";
import type { AuthContext } from "../common/guards/app-auth.guard";
import { NotifyService } from "../notify/notify.service";
import { PrismaService } from "../prisma/prisma.service";
import {
  AdminUpdateTicketDto,
  CreateMilestoneDto,
  CreateProjectDto,
  CreateTicketDto,
  StaffReplyDto,
  UpdateMilestoneDto,
  UpdateProjectDto,
} from "./portal.dto";

const TICKET_LIST_SELECT = {
  id: true,
  code: true,
  subject: true,
  category: true,
  priority: true,
  status: true,
  projectId: true,
  lastReplyAt: true,
  createdAt: true,
  messages: { orderBy: { createdAt: "desc" as const }, take: 1, select: { authorType: true, body: true, createdAt: true } },
} satisfies Prisma.SupportTicketSelect;

function ticketCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(6);
  return "TK-" + Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

/**
 * Cổng khách hàng: chủ doanh nghiệp đăng nhập Zalo trong Mini App reMini để xem
 * Mini App đã đăng, tiến độ dự án và ticket hỗ trợ. Phần quản trị (admin) cập nhật dữ liệu này.
 */
@Injectable()
export class PortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notify: NotifyService,
  ) {}

  private async customerLabel(customerId: string) {
    const c = await this.prisma.platformCustomer.findUnique({ where: { id: customerId }, select: { name: true, companyName: true } });
    return c?.companyName || c?.name || "Khách hàng";
  }

  /**
   * Xác định khách hàng của người đang đăng nhập.
   * Lần đầu: tự gắn theo SĐT Zalo đã xác minh khớp SĐT khách hàng / nhân sự của khách hàng.
   * (Chỉ dùng SĐT lấy từ Zalo — người dùng không tự khai được.)
   */
  async resolveCustomerId(auth: AuthContext): Promise<string | null> {
    if (auth.customerId) return auth.customerId;
    if (!auth.userId) return null;
    const user = await this.prisma.user.findUnique({ where: { id: auth.userId }, select: { phone: true, provider: true } });
    if (!user?.phone || user.provider !== "zalo") return null;

    const customer =
      (await this.prisma.platformCustomer.findFirst({ where: { phone: user.phone, status: "active" }, select: { id: true } })) ??
      (await this.prisma.customerStaff
        .findFirst({ where: { phone: user.phone, active: true }, select: { customerId: true } })
        .then((s) => (s ? { id: s.customerId } : null)));
    if (!customer) return null;
    await this.prisma.user.update({ where: { id: auth.userId }, data: { customerId: customer.id } });
    return customer.id;
  }

  private async requireCustomer(auth: AuthContext): Promise<string> {
    const id = await this.resolveCustomerId(auth);
    if (!id) throw new ForbiddenException("Tài khoản Zalo này chưa gắn với hợp đồng nào");
    return id;
  }

  // ───────────────────────── Khách hàng ─────────────────────────

  async overview(auth: AuthContext) {
    const user = auth.userId
      ? await this.prisma.user.findUnique({
          where: { id: auth.userId },
          select: { id: true, name: true, phone: true, avatarUrl: true, provider: true },
        })
      : null;
    const customerId = await this.resolveCustomerId(auth);
    if (!customerId) return { user, customer: null, apps: [], projects: [], tickets: [], subscriptions: [] };

    const [customer, apps, projects, tickets, subscriptions] = await Promise.all([
      this.prisma.platformCustomer.findUnique({
        where: { id: customerId },
        select: { id: true, name: true, companyName: true, phone: true, email: true },
      }),
      this.prisma.store.findMany({
        where: { customerId },
        select: {
          id: true,
          name: true,
          slug: true,
          subtitle: true,
          logoUrl: true,
          templateId: true,
          zaloAppId: true,
          active: true,
          updatedAt: true,
          subscription: { select: { status: true, expiresAt: true, plan: { select: { name: true } } } },
          _count: { select: { products: true, customers: true, orders: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.project.findMany({
        where: { customerId },
        include: { milestones: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] } },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.supportTicket.findMany({ where: { customerId }, select: TICKET_LIST_SELECT, orderBy: { lastReplyAt: "desc" }, take: 50 }),
      this.prisma.subscription.findMany({
        where: { customerId },
        select: { id: true, status: true, billingCycle: true, startedAt: true, expiresAt: true, autoRenew: true, plan: { select: { name: true, code: true } } },
        orderBy: { expiresAt: "desc" },
      }),
    ]);
    return { user, customer, apps, projects, tickets, subscriptions };
  }

  async getMyTicket(auth: AuthContext, id: string) {
    const customerId = await this.requireCustomer(auth);
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id, customerId },
      include: { messages: { orderBy: { createdAt: "asc" } }, project: { select: { id: true, name: true } } },
    });
    if (!ticket) throw new NotFoundException("Không tìm thấy ticket");
    return ticket;
  }

  async createTicket(auth: AuthContext, dto: CreateTicketDto, authorName: string) {
    const customerId = await this.requireCustomer(auth);
    if (dto.projectId) {
      const ok = await this.prisma.project.count({ where: { id: dto.projectId, customerId } });
      if (!ok) throw new NotFoundException("Không tìm thấy dự án");
    }
    const open = await this.prisma.supportTicket.count({ where: { customerId, status: { in: ["open", "in_progress"] } } });
    if (open >= 20) throw new ForbiddenException("Bạn đang có quá nhiều ticket chưa xử lý, vui lòng chờ phản hồi");

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const created = await this.prisma.supportTicket.create({
          data: {
            code: ticketCode(),
            customerId,
            projectId: dto.projectId,
            storeId: dto.storeId,
            subject: dto.subject.trim(),
            category: dto.category ?? "technical",
            priority: dto.priority ?? "normal",
            createdById: auth.userId,
            messages: { create: { authorType: "customer", authorId: auth.userId, authorName, body: dto.body.trim() } },
          },
          select: TICKET_LIST_SELECT,
        });
        this.notify.notify({
          type: "ticket.created",
          code: created.code,
          subject: created.subject,
          customer: await this.customerLabel(customerId),
          category: created.category,
        });
        return created;
      } catch (e) {
        if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) throw e;
      }
    }
    throw new Error("Không tạo được mã ticket");
  }

  async customerReply(auth: AuthContext, id: string, body: string, authorName: string) {
    const ticket = await this.getMyTicket(auth, id);
    if (ticket.status === "closed") throw new ForbiddenException("Ticket đã đóng, vui lòng tạo ticket mới");
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.ticketMessage.create({ data: { ticketId: id, authorType: "customer", authorId: auth.userId, authorName, body: body.trim() } }),
      this.prisma.supportTicket.update({
        where: { id },
        // Khách trả lời → quay lại hàng chờ của nhân viên
        data: { lastReplyAt: now, status: ["waiting_customer", "resolved"].includes(ticket.status) ? "open" : ticket.status },
      }),
    ]);
    this.notify.notify({
      type: "ticket.customer_reply",
      code: ticket.code,
      subject: ticket.subject,
      customer: await this.customerLabel(ticket.customerId),
      body,
    });
    return this.getMyTicket(auth, id);
  }

  async customerClose(auth: AuthContext, id: string, authorName: string) {
    await this.getMyTicket(auth, id);
    await this.prisma.$transaction([
      this.prisma.ticketMessage.create({ data: { ticketId: id, authorType: "system", authorName, body: "Khách hàng đã đóng ticket" } }),
      this.prisma.supportTicket.update({ where: { id }, data: { status: "closed", resolvedAt: new Date() } }),
    ]);
    return this.getMyTicket(auth, id);
  }

  // ───────────────────────── Quản trị: dự án ─────────────────────────

  listProjects(customerId?: string) {
    return this.prisma.project.findMany({
      where: customerId ? { customerId } : undefined,
      include: {
        customer: { select: { id: true, name: true, companyName: true, phone: true } },
        milestones: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
        _count: { select: { tickets: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  createProject(dto: CreateProjectDto) {
    const { milestones, startDate, dueDate, ...rest } = dto;
    return this.prisma.project.create({
      data: {
        ...rest,
        startDate: startDate ? new Date(startDate) : undefined,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        milestones: milestones?.length ? { create: milestones.map((title, i) => ({ title, sortOrder: i })) } : undefined,
      },
      include: { milestones: true },
    });
  }

  async updateProject(id: string, dto: UpdateProjectDto) {
    const { milestones: _ignored, startDate, dueDate, ...rest } = dto;
    await this.prisma.project.findUniqueOrThrow({ where: { id } }).catch(() => {
      throw new NotFoundException("Không tìm thấy dự án");
    });
    return this.prisma.project.update({
      where: { id },
      data: {
        ...rest,
        ...(startDate !== undefined ? { startDate: startDate ? new Date(startDate) : null } : {}),
        ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {}),
      },
      include: { milestones: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] } },
    });
  }

  removeProject(id: string) {
    return this.prisma.project.delete({ where: { id } });
  }

  /** Tiến độ tự tính theo số mốc đã xong (nếu dự án có mốc). */
  private async recomputeProgress(projectId: string) {
    const ms = await this.prisma.projectMilestone.findMany({ where: { projectId }, select: { status: true } });
    if (!ms.length) return;
    const done = ms.filter((m) => m.status === "done").length;
    const doing = ms.filter((m) => m.status === "doing").length;
    const progress = Math.round(((done + doing * 0.5) / ms.length) * 100);
    await this.prisma.project.update({ where: { id: projectId }, data: { progress } });
  }

  async addMilestone(projectId: string, dto: CreateMilestoneDto) {
    const m = await this.prisma.projectMilestone.create({
      data: { projectId, title: dto.title, status: dto.status ?? "todo", sortOrder: dto.sortOrder ?? 99, dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined },
    });
    await this.recomputeProgress(projectId);
    return m;
  }

  async updateMilestone(id: string, dto: UpdateMilestoneDto) {
    const existing = await this.prisma.projectMilestone.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Không tìm thấy mốc công việc");
    const m = await this.prisma.projectMilestone.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.dueDate !== undefined ? { dueDate: dto.dueDate ? new Date(dto.dueDate) : null } : {}),
        ...(dto.status !== undefined ? { status: dto.status, doneAt: dto.status === "done" ? new Date() : null } : {}),
      },
    });
    await this.recomputeProgress(existing.projectId);
    return m;
  }

  async removeMilestone(id: string) {
    const m = await this.prisma.projectMilestone.delete({ where: { id } });
    await this.recomputeProgress(m.projectId);
    return { id, deleted: true };
  }

  // ───────────────────────── Quản trị: ticket ─────────────────────────

  listTickets(status?: string) {
    return this.prisma.supportTicket.findMany({
      where: status ? { status } : { status: { not: "closed" } },
      select: { ...TICKET_LIST_SELECT, customer: { select: { id: true, name: true, companyName: true, phone: true } } },
      orderBy: [{ lastReplyAt: "desc" }],
      take: 300,
    });
  }

  async getTicket(id: string) {
    const t = await this.prisma.supportTicket.findUnique({
      where: { id },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
        customer: { select: { id: true, name: true, companyName: true, phone: true } },
        project: { select: { id: true, name: true } },
      },
    });
    if (!t) throw new NotFoundException("Không tìm thấy ticket");
    return t;
  }

  async updateTicket(id: string, dto: AdminUpdateTicketDto) {
    await this.getTicket(id);
    return this.prisma.supportTicket.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.status && ["resolved", "closed"].includes(dto.status) ? { resolvedAt: new Date() } : {}),
      },
    });
  }

  async staffReply(id: string, dto: StaffReplyDto, auth: AuthContext) {
    await this.getTicket(id);
    const staff = auth.userId ? await this.prisma.user.findUnique({ where: { id: auth.userId }, select: { name: true } }) : null;
    await this.prisma.$transaction([
      this.prisma.ticketMessage.create({
        data: { ticketId: id, authorType: "staff", authorId: auth.userId, authorName: staff?.name ?? "reMini Support", body: dto.body.trim() },
      }),
      this.prisma.supportTicket.update({
        where: { id },
        data: {
          lastReplyAt: new Date(),
          status: dto.status ?? "waiting_customer",
          ...(dto.status && ["resolved", "closed"].includes(dto.status) ? { resolvedAt: new Date() } : {}),
        },
      }),
    ]);
    return this.getTicket(id);
  }
}
