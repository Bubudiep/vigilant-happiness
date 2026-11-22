import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";
import { AuthService } from "../auth/auth.service";
import { PrismaService } from "../prisma/prisma.service";

export const SHOP_SCOPE = "shop";

export interface ShopTokenPayload extends Record<string, unknown> {
  /** StoreCustomer.id */
  sub: string;
  /** Store.id */
  sid: string;
}

export interface ShopRequest extends Request {
  shop?: { storeId: string; customerId: string };
}

/**
 * Khách của gian hàng gọi API bằng token nhận được khi đăng nhập Zalo trong Mini App của store đó.
 * Token chỉ dùng được cho đúng store đã cấp (khớp slug trên URL).
 */
@Injectable()
export class ShopAuthGuard implements CanActivate {
  constructor(
    private readonly auth: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<ShopRequest>();
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) throw new UnauthorizedException("Vui lòng đăng nhập Zalo để tiếp tục");
    const payload = this.auth.verifyScoped<ShopTokenPayload>(SHOP_SCOPE, header.slice(7).trim());
    const customer = await this.prisma.storeCustomer.findFirst({
      where: { id: payload.sub, storeId: payload.sid, store: { slug: String(req.params.slug ?? ""), active: true } },
      select: { id: true, storeId: true },
    });
    if (!customer) throw new UnauthorizedException("Phiên đăng nhập không thuộc cửa hàng này");
    req.shop = { storeId: customer.storeId, customerId: customer.id };
    return true;
  }
}
