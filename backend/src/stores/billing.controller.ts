import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AppAuthGuard, RequireScopes, type AppRequest } from "../common/guards/app-auth.guard";
import { BillingService } from "./billing.service";
import { WalletService } from "./wallet.service";

/** Thu tiền lịch hẹn, cách thu tiền liệu trình, công nợ khách — /stores/:id/... */
@ApiTags("stores")
@ApiBearerAuth()
@UseGuards(AppAuthGuard)
@RequireScopes("stores:write")
@Controller("stores/:id")
export class BillingController {
  constructor(
    private readonly billing: BillingService,
    private readonly wallet: WalletService,
  ) {}

  @Get("customers/:customerId/wallet")
  @ApiOperation({ summary: "Ví khách: số dư + lịch sử (trả thừa, nạp trước, trừ vào đơn, hoàn tiền, điều chỉnh)" })
  walletHistory(@Req() req: AppRequest, @Param("id") id: string, @Param("customerId") customerId: string) {
    return this.wallet.history(req.auth!, id, customerId);
  }

  @Post("customers/:customerId/wallet")
  @ApiOperation({ summary: "Nạp ví (topup) / hoàn tiền cho khách (refund) / điều chỉnh (adjust ±) — bắt buộc có lý do" })
  walletAdjust(@Req() req: AppRequest, @Param("id") id: string, @Param("customerId") customerId: string, @Body() body: Parameters<WalletService["adjust"]>[3]) {
    return this.wallet.adjust(req.auth!, id, customerId, body ?? {});
  }

  @Post("bookings/:bookingId/checkout")
  @ApiOperation({ summary: "Thu tiền lịch hẹn: bill dịch vụ + bán thêm + phụ thu → đơn đã hoàn thành; trả thiếu = ghi nợ" })
  checkout(@Req() req: AppRequest, @Param("id") id: string, @Param("bookingId") bookingId: string, @Body() body: Parameters<BillingService["checkoutBooking"]>[3]) {
    return this.billing.checkoutBooking(req.auth!, id, bookingId, body ?? {});
  }

  @Get("treatments")
  @ApiOperation({ summary: "Cách thu tiền & công nợ của từng liệu trình" })
  treatments(@Req() req: AppRequest, @Param("id") id: string) {
    return this.billing.treatments(req.auth!, id);
  }

  @Post("treatments")
  @ApiOperation({ summary: "Lưu cách thu tiền liệu trình (session / package / flexible), tạo đơn gói nếu cần" })
  saveTreatment(@Req() req: AppRequest, @Param("id") id: string, @Body() body: Parameters<BillingService["saveTreatment"]>[2]) {
    return this.billing.saveTreatment(req.auth!, id, body ?? {});
  }

  @Get("debts")
  @ApiOperation({ summary: "Công nợ: khách còn nợ & các đơn chưa thu đủ" })
  debts(@Req() req: AppRequest, @Param("id") id: string) {
    return this.billing.debts(req.auth!, id);
  }

  @Post("debts/collect")
  @ApiOperation({ summary: "Thu nợ theo đơn (orderId) hoặc theo khách (customerId / phone — trừ đơn cũ trước)" })
  collect(@Req() req: AppRequest, @Param("id") id: string, @Body() body: Parameters<BillingService["collect"]>[2]) {
    return this.billing.collect(req.auth!, id, body ?? {});
  }
}
