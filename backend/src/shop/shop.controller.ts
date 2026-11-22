import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { RateLimit, RateLimitGuard } from "../common/guards/rate-limit.guard";
import { ShopAuthGuard, type ShopRequest } from "./shop-auth.guard";
import { ShopService } from "./shop.service";

/**
 * API cho khách của từng gian hàng (gọi từ Mini App của store).
 * Đăng nhập Zalo → token riêng của store → xem/sửa hồ sơ, đặt hàng, đặt lịch, xem điểm & voucher.
 */
@ApiTags("shop")
@Controller("shop/:slug")
export class ShopController {
  constructor(private readonly shop: ShopService) {}

  @Post("auth/zalo")
  @UseGuards(RateLimitGuard)
  @RateLimit(20, 600)
  @ApiOperation({ summary: "Khách đăng nhập Zalo trong Mini App của store (body: accessToken, phoneToken?)" })
  login(@Param("slug") slug: string, @Body() body: { accessToken?: string; phoneToken?: string }) {
    return this.shop.loginWithZalo(slug, String(body?.accessToken ?? ""), body?.phoneToken ? String(body.phoneToken) : undefined);
  }

  @Get("me")
  @UseGuards(ShopAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Hồ sơ khách, hạng, điểm và voucher dùng được tại store" })
  me(@Req() req: ShopRequest) {
    return this.shop.me(req.shop!.customerId);
  }

  @Patch("me")
  @UseGuards(ShopAuthGuard)
  @ApiBearerAuth()
  updateMe(@Req() req: ShopRequest, @Body() body: { name?: string; address?: string; phone?: string }) {
    return this.shop.updateMe(req.shop!.customerId, {
      name: typeof body?.name === "string" ? body.name.slice(0, 100) : undefined,
      address: typeof body?.address === "string" ? body.address.slice(0, 250) : undefined,
      phone: typeof body?.phone === "string" ? body.phone : undefined,
    });
  }

  @Get("me/orders")
  @UseGuards(ShopAuthGuard)
  @ApiBearerAuth()
  orders(@Req() req: ShopRequest) {
    return this.shop.myOrders(req.shop!.customerId);
  }

  @Post("me/orders")
  @UseGuards(ShopAuthGuard, RateLimitGuard)
  @RateLimit(20, 600)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Đặt hàng (items: [{ productId, quantity }], voucherCode?) — giá & giảm giá tính lại ở máy chủ" })
  createOrder(@Req() req: ShopRequest, @Body() body: Parameters<ShopService["createOrder"]>[2]) {
    return this.shop.createOrder(req.shop!.storeId, req.shop!.customerId, body ?? {});
  }

  @Get("me/bookings")
  @UseGuards(ShopAuthGuard)
  @ApiBearerAuth()
  bookings(@Req() req: ShopRequest) {
    return this.shop.myBookings(req.shop!.customerId);
  }

  @Post("me/bookings")
  @UseGuards(ShopAuthGuard, RateLimitGuard)
  @RateLimit(20, 600)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Đặt lịch (serviceName, date YYYY-MM-DD, timeSlot, note?)" })
  createBooking(@Req() req: ShopRequest, @Body() body: Parameters<ShopService["createBooking"]>[2]) {
    return this.shop.createBooking(req.shop!.storeId, req.shop!.customerId, body ?? {});
  }
}
