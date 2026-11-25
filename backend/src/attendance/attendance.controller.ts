import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AppAuthGuard, RequireScopes, type AppRequest } from "../common/guards/app-auth.guard";
import { AttendanceService, type AttendanceInput } from "./attendance.service";

/** Chấm công nhân sự của gian hàng: /stores/:id/attendance */
@ApiTags("attendance")
@ApiBearerAuth()
@UseGuards(AppAuthGuard)
@RequireScopes("stores:write")
@Controller("stores/:id/attendance")
export class AttendanceController {
  constructor(private readonly attendance: AttendanceService) {}

  @Get()
  @ApiOperation({ summary: "Bảng chấm công ?from=YYYY-MM-DD&to=YYYY-MM-DD (kèm trạng thái nhân viên đã đồng bộ)" })
  list(@Req() req: AppRequest, @Param("id") id: string, @Query("from") from: string, @Query("to") to: string) {
    return this.attendance.list(req.auth!, id, String(from ?? ""), String(to ?? ""));
  }

  @Put()
  @ApiOperation({ summary: "Nhập / sửa tay: { staffId, workDate, status?, checkIn?, checkOut?, note? }" })
  upsert(@Req() req: AppRequest, @Param("id") id: string, @Body() body: AttendanceInput) {
    return this.attendance.upsert(req.auth!, id, body);
  }

  @Post("punch")
  @ApiOperation({ summary: "Chấm vào / chấm ra ngay bây giờ: { staffId }" })
  punch(@Req() req: AppRequest, @Param("id") id: string, @Body() body: { staffId?: string }) {
    return this.attendance.punchFromWeb(req.auth!, id, String(body?.staffId ?? ""));
  }

  @Delete(":recordId")
  @ApiOperation({ summary: "Xoá một ô chấm công" })
  remove(@Req() req: AppRequest, @Param("id") id: string, @Param("recordId") recordId: string) {
    return this.attendance.remove(req.auth!, id, recordId);
  }
}
