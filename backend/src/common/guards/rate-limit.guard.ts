import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable, SetMetadata } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";

const RATE_LIMIT = "app_rate_limit";

/** Tối đa `limit` request mỗi `windowSec` giây cho mỗi IP (trên một route). */
export const RateLimit = (limit: number, windowSec: number) => SetMetadata(RATE_LIMIT, { limit, windowSec });

/**
 * Giới hạn tần suất đơn giản trong bộ nhớ — đủ chặn spam form / dò mật khẩu cho 1 instance.
 * Chạy nhiều instance (PM2 cluster) thì nên chuyển sang Redis.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly hits = new Map<string, { count: number; resetAt: number }>();

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const cfg = this.reflector.get<{ limit: number; windowSec: number }>(RATE_LIMIT, context.getHandler());
    if (!cfg) return true;
    // Chỉ dùng cho server test (test/start-test-server.js); luôn bị bỏ qua khi NODE_ENV=production
    if (process.env.RATE_LIMIT_DISABLED === "true" && process.env.NODE_ENV !== "production") return true;
    const req = context.switchToHttp().getRequest<Request>();
    // req.ip đã tính X-Forwarded-For nếu bật TRUST_PROXY (main.ts) — không đọc header trực tiếp để tránh giả IP
    const ip = req.ip || "unknown";
    const key = `${context.getClass().name}.${context.getHandler().name}:${ip}`;
    const now = Date.now();

    const entry = this.hits.get(key);
    if (!entry || entry.resetAt < now) {
      this.hits.set(key, { count: 1, resetAt: now + cfg.windowSec * 1000 });
      if (this.hits.size > 10000) this.cleanup(now);
      return true;
    }
    entry.count += 1;
    if (entry.count > cfg.limit) {
      throw new HttpException(
        { statusCode: 429, message: "Bạn thao tác quá nhanh, vui lòng thử lại sau ít phút" },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }

  private cleanup(now: number) {
    for (const [k, v] of this.hits) if (v.resetAt < now) this.hits.delete(k);
  }
}
