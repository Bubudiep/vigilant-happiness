import { Body, Controller, Get, HttpCode, Param, Post, Put, RawBodyRequest, Req, Res, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Request, Response } from "express";
import { AppAuthGuard, RequireScopes, type AppRequest } from "../common/guards/app-auth.guard";
import { TingeeService } from "./tingee.service";

/** Cấu hình Tingee & yêu cầu thanh toán chuyển khoản — /stores/:id/... */
@ApiTags("stores")
@ApiBearerAuth()
@UseGuards(AppAuthGuard)
@RequireScopes("stores:write")
@Controller("stores/:id")
export class TingeeController {
  constructor(private readonly tingee: TingeeService) {}

  @Get("tingee")
  @ApiOperation({ summary: "Cấu hình Tingee (Client ID, đã lưu Secret Token chưa, đường dẫn webhook, giao dịch gần đây)" })
  config(@Req() req: AppRequest, @Param("id") id: string) {
    return this.tingee.config(req.auth!, id);
  }

  @Put("tingee")
  @ApiOperation({ summary: "Lưu Client ID / Secret Token Tingee (secret rỗng = gỡ)" })
  save(@Req() req: AppRequest, @Param("id") id: string, @Body() body: { clientId?: string; secretToken?: string }) {
    return this.tingee.saveConfig(req.auth!, id, body ?? {});
  }

  @Post("payment-requests")
  @ApiOperation({ summary: "Tạo mã tham chiếu cho 1 lần thu chuyển khoản (nội dung QR)" })
  create(@Req() req: AppRequest, @Param("id") id: string, @Body() body: { amount?: number; note?: string }) {
    return this.tingee.createRequest(req.auth!, id, body ?? {});
  }

  @Get("payment-requests/:requestId")
  @ApiOperation({ summary: "Trạng thái yêu cầu thanh toán (pending / partial / paid)" })
  get(@Req() req: AppRequest, @Param("id") id: string, @Param("requestId") requestId: string) {
    return this.tingee.getRequest(req.auth!, id, requestId);
  }
}

/** Webhook Tingee của từng gian hàng — công khai, xác thực bằng chữ ký HMAC (Secret Token của gian hàng). */
@ApiTags("tingee")
@Controller("tingee")
export class TingeeWebhookController {
  constructor(private readonly tingee: TingeeService) {}

  @Post("webhook/:slug")
  @HttpCode(200)
  async webhook(@Param("slug") slug: string, @Req() req: RawBodyRequest<Request>, @Body() body: Record<string, unknown>, @Res({ passthrough: true }) res: Response) {
    const r = await this.tingee.webhook(slug, req.headers, req.rawBody?.toString("utf8"), body ?? {});
    res.status(r.status);
    return r.body;
  }
}
