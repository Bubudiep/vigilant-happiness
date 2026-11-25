import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AppAuthGuard, RequireScopes, type AppRequest } from "../common/guards/app-auth.guard";
import { PosService } from "./pos.service";
import { ReportsService } from "./reports.service";

/** Bán hàng tại quầy: /stores/:id/pos/... và báo cáo /stores/:id/reports */
@ApiTags("pos")
@ApiBearerAuth()
@UseGuards(AppAuthGuard)
@RequireScopes("stores:write")
@Controller("stores/:id")
export class PosController {
  constructor(
    private readonly pos: PosService,
    private readonly reports: ReportsService,
  ) {}

  @Get("pos")
  @ApiOperation({ summary: "Khu vực, bàn / phòng và các phiên đang mở" })
  overview(@Req() req: AppRequest, @Param("id") id: string) {
    return this.pos.overview(req.auth!, id);
  }

  @Post("pos/areas")
  createArea(@Req() req: AppRequest, @Param("id") id: string, @Body() body: unknown) {
    return this.pos.createArea(req.auth!, id, body);
  }

  @Patch("pos/areas/:areaId")
  updateArea(@Req() req: AppRequest, @Param("id") id: string, @Param("areaId") areaId: string, @Body() body: unknown) {
    return this.pos.updateArea(req.auth!, id, areaId, body);
  }

  @Delete("pos/areas/:areaId")
  removeArea(@Req() req: AppRequest, @Param("id") id: string, @Param("areaId") areaId: string) {
    return this.pos.removeArea(req.auth!, id, areaId);
  }

  @Post("pos/tables")
  @ApiOperation({ summary: "Thêm bàn / phòng" })
  createTable(@Req() req: AppRequest, @Param("id") id: string, @Body() body: unknown) {
    return this.pos.createTable(req.auth!, id, body);
  }

  @Post("pos/tables/bulk")
  @ApiOperation({ summary: "Thêm nhanh nhiều bàn: { prefix, from, count, areaId, kind, pricePerHour… }" })
  createTablesBulk(@Req() req: AppRequest, @Param("id") id: string, @Body() body: { prefix?: string; from?: number; count?: number }) {
    return this.pos.createTablesBulk(req.auth!, id, body ?? {});
  }

  @Patch("pos/tables/:tableId")
  updateTable(@Req() req: AppRequest, @Param("id") id: string, @Param("tableId") tableId: string, @Body() body: unknown) {
    return this.pos.updateTable(req.auth!, id, tableId, body);
  }

  @Delete("pos/tables/:tableId")
  removeTable(@Req() req: AppRequest, @Param("id") id: string, @Param("tableId") tableId: string) {
    return this.pos.removeTable(req.auth!, id, tableId);
  }

  @Post("pos/tables/:tableId/open")
  @ApiOperation({ summary: "Mở bàn: { guestCount?, customerId?, customerName?, note?, startedAt? }" })
  open(@Req() req: AppRequest, @Param("id") id: string, @Param("tableId") tableId: string, @Body() body: Record<string, never>) {
    return this.pos.open(req.auth!, id, tableId, body ?? {});
  }

  @Patch("pos/sessions/:sessionId")
  @ApiOperation({ summary: "Sửa phiên: { items?, guestCount?, customerId?, customerName?, note?, discount?, startedAt? }" })
  updateSession(@Req() req: AppRequest, @Param("id") id: string, @Param("sessionId") sid: string, @Body() body: Record<string, never>) {
    return this.pos.updateSession(req.auth!, id, sid, body ?? {});
  }

  @Post("pos/sessions/:sessionId/move")
  @ApiOperation({ summary: "Chuyển bàn: { tableId }" })
  move(@Req() req: AppRequest, @Param("id") id: string, @Param("sessionId") sid: string, @Body() body: { tableId?: string }) {
    return this.pos.move(req.auth!, id, sid, String(body?.tableId ?? ""));
  }

  @Post("pos/sessions/:sessionId/checkout")
  @ApiOperation({ summary: "Thanh toán: { paymentMethod?, discount?, cleaning? } → tạo đơn nguồn pos" })
  checkout(@Req() req: AppRequest, @Param("id") id: string, @Param("sessionId") sid: string, @Body() body: { paymentMethod?: string; discount?: number; cleaning?: boolean }) {
    return this.pos.checkout(req.auth!, id, sid, body ?? {});
  }

  @Post("pos/sessions/:sessionId/cancel")
  cancel(@Req() req: AppRequest, @Param("id") id: string, @Param("sessionId") sid: string) {
    return this.pos.cancel(req.auth!, id, sid);
  }

  @Get("reports")
  @ApiOperation({ summary: "Báo cáo doanh thu ?from=YYYY-MM-DD&to=YYYY-MM-DD (giờ VN)" })
  report(@Req() req: AppRequest, @Param("id") id: string, @Query("from") from: string, @Query("to") to: string) {
    return this.reports.revenue(req.auth!, id, String(from ?? ""), String(to ?? ""));
  }
}
