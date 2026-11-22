import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { AppRequest } from "../common/guards/app-auth.guard";
import { PrismaService } from "../prisma/prisma.service";

/** Trường nhạy cảm không bao giờ được ghi vào nhật ký. */
const REDACT = /secret|token|password|authorization|key/i;

function clean(meta: Record<string, unknown> | undefined): Prisma.InputJsonValue | undefined {
  if (!meta) return undefined;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) out[k] = REDACT.test(k) ? "***" : v;
  return out as Prisma.InputJsonValue;
}

@Injectable()
export class AuditService {
  private readonly log = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Ghi nhật ký; lỗi ghi log không làm hỏng thao tác chính. */
  async record(req: AppRequest, action: string, target?: { type?: string; id?: string }, meta?: Record<string, unknown>): Promise<void> {
    try {
      const a = req.auth;
      const actorLabel = a?.email ?? (a?.clientId ? `kênh ${a.clientId}` : a?.userId ? `user ${a.userId}` : a?.isAdmin ? "x-admin-key" : "ẩn danh");
      await this.prisma.auditLog.create({
        data: { actorId: a?.userId, actorLabel, action, targetType: target?.type, targetId: target?.id, meta: clean(meta), ip: req.ip },
      });
    } catch (e) {
      this.log.warn(`Không ghi được audit log (${action}): ${e instanceof Error ? e.message : e}`);
    }
  }

  list(params: { action?: string; take?: number }) {
    return this.prisma.auditLog.findMany({
      where: params.action ? { action: { startsWith: params.action } } : undefined,
      orderBy: { createdAt: "desc" },
      take: Math.min(params.take ?? 200, 500),
    });
  }
}
