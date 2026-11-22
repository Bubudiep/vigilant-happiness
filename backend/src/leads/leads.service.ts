import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { LeadStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateLeadDto } from "./dto/create-lead.dto";
import { UpdateLeadDto } from "./dto/update-lead-status.dto";

export interface LeadFilter {
  status?: LeadStatus;
  requestType?: string;
  from?: string;
  to?: string;
  /** "only" = chỉ xem nghi spam, "all" = tất cả, mặc định ẩn spam */
  spam?: "only" | "all";
}

export const SPAM_FLAG_SCORE = 40;

/** "2026-11-21" → Date 00:00 giờ Việt Nam (lưu UTC). */
function vnDate(isoDay: string): Date {
  return new Date(`${isoDay.slice(0, 10)}T00:00:00+07:00`);
}

@Injectable()
export class LeadsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Tạo yêu cầu tư vấn / đặt lịch gọi lại.
   * `userId` có khi người gửi đã đăng nhập Zalo: nếu SĐT trùng SĐT Zalo đã xác minh → phoneVerified.
   */
  async create(dto: CreateLeadDto, userId?: string, meta: { spamScore?: number; ip?: string } = {}) {
    const requestType = dto.requestType ?? (dto.callbackDate ? "callback" : "consultation");
    let callbackDate: Date | null = null;

    if (requestType === "callback") {
      if (!dto.callbackDate || !dto.callbackSlot) {
        throw new BadRequestException("Vui lòng chọn ngày và khung giờ muốn được gọi lại");
      }
      callbackDate = vnDate(dto.callbackDate);
      const today = vnDate(new Date(Date.now() + 7 * 3600 * 1000).toISOString());
      const maxDay = new Date(today.getTime() + 30 * 86400 * 1000);
      if (callbackDate < today || callbackDate > maxDay) {
        throw new BadRequestException("Ngày gọi lại phải trong vòng 30 ngày tới");
      }
    }

    // Bấm gửi nhiều lần / gửi lại trong 10 phút → trả về yêu cầu cũ thay vì tạo bản trùng
    const duplicate = await this.prisma.consultationLead.findFirst({
      where: { phone: dto.phone, requestType, createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) } },
      orderBy: { createdAt: "desc" },
      select: { id: true, requestType: true, callbackDate: true, callbackSlot: true, status: true, createdAt: true },
    });
    if (duplicate) return { ...duplicate, duplicate: true };

    let phoneVerified = false;
    if (userId) {
      const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { phone: true, provider: true } });
      phoneVerified = !!user && user.provider === "zalo" && user.phone === dto.phone;
    }

    return this.prisma.consultationLead.create({
      data: {
        name: dto.name,
        phone: dto.phone,
        industry: dto.industry,
        templateId: dto.templateId,
        note: dto.note,
        source: dto.source ?? "zalo_mini_app",
        requestType,
        callbackDate,
        callbackSlot: requestType === "callback" ? dto.callbackSlot : null,
        userId: userId ?? null,
        phoneVerified,
        spamScore: meta.spamScore ?? 0,
        ipAddress: meta.ip ?? null,
      },
      select: { id: true, requestType: true, callbackDate: true, callbackSlot: true, status: true, createdAt: true },
    });
  }

  /** Danh sách cho quản trị. Lịch gọi lại sắp xếp theo ngày + khung giờ gần nhất trước. */
  async findAll(filter: LeadFilter = {}) {
    const where: Prisma.ConsultationLeadWhereInput = {
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.requestType ? { requestType: filter.requestType } : {}),
      ...(filter.spam === "only"
        ? { spamScore: { gte: SPAM_FLAG_SCORE } }
        : filter.spam === "all"
          ? {}
          : { spamScore: { lt: SPAM_FLAG_SCORE } }),
      ...(filter.from || filter.to
        ? {
            callbackDate: {
              ...(filter.from ? { gte: vnDate(filter.from) } : {}),
              ...(filter.to ? { lte: vnDate(filter.to) } : {}),
            },
          }
        : {}),
    };
    return this.prisma.consultationLead.findMany({
      where,
      include: { user: { select: { id: true, name: true, avatarUrl: true, provider: true } } },
      orderBy:
        filter.requestType === "callback"
          ? [{ callbackDate: "asc" }, { callbackSlot: "asc" }, { createdAt: "asc" }]
          : [{ createdAt: "desc" }],
      take: 500,
    });
  }

  async updateStatus(id: string, status: LeadStatus) {
    return this.update(id, { status });
  }

  async update(id: string, dto: UpdateLeadDto) {
    const existing = await this.prisma.consultationLead.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Không tìm thấy yêu cầu tư vấn");

    return this.prisma.consultationLead.update({
      where: { id },
      data: {
        ...(dto.status ? { status: dto.status } : {}),
        ...(dto.staffNote !== undefined ? { staffNote: dto.staffNote } : {}),
        ...(dto.spam === true ? { spamScore: 100, status: "ARCHIVED" as const } : {}),
        ...(dto.spam === false ? { spamScore: 0 } : {}),
        ...(dto.status === "CONTACTED" && !existing.contactedAt ? { contactedAt: new Date() } : {}),
      },
    });
  }
}
