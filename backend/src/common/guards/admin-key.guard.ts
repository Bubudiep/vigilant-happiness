import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Request } from "express";

/** Bảo vệ các route quản trị bằng header `x-admin-key`. */
@Injectable()
export class AdminKeyGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const provided = req.headers["x-admin-key"];
    const expected = this.config.get<string>("ADMIN_API_KEY");

    if (!expected || provided !== expected) {
      throw new UnauthorizedException("Invalid or missing x-admin-key");
    }
    return true;
  }
}
