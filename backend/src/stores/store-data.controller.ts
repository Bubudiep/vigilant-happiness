import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AppAuthGuard, RequireScopes, type AppRequest } from "../common/guards/app-auth.guard";
import { Collection, COLLECTIONS, StoreDataService } from "./store-data.service";

const col = (c: string): Collection => {
  if (!(COLLECTIONS as readonly string[]).includes(c)) throw new BadRequestException(`Không hỗ trợ "${c}"`);
  return c as Collection;
};

/**
 * Chủ shop quản lý dữ liệu vận hành của store: /stores/:id/data/<bookings|events|documents|member-tiers|vouchers|orders>
 * Danh sách đọc kèm trong GET /stores/:id.
 */
@ApiTags("stores")
@ApiBearerAuth()
@UseGuards(AppAuthGuard)
@RequireScopes("stores:write")
@Controller("stores/:id/data")
export class StoreDataController {
  constructor(private readonly data: StoreDataService) {}

  @Post("orders/preview-voucher")
  @ApiOperation({ summary: "Kiểm tra mã voucher & số tiền giảm khi tạo đơn (không ghi)" })
  previewVoucher(
    @Req() req: AppRequest,
    @Param("id") id: string,
    @Body() body: { code?: string; subtotal?: number; shippingFee?: number; customerId?: string },
  ) {
    return this.data.previewVoucher(req.auth!, id, body ?? {});
  }

  @Get("vouchers/:voucherId/codes")
  @ApiOperation({ summary: "Danh sách mã thẻ (dùng 1 lần) của voucher" })
  listCodes(@Req() req: AppRequest, @Param("id") id: string, @Param("voucherId") voucherId: string) {
    return this.data.listCodes(req.auth!, id, voucherId);
  }

  @Post("vouchers/:voucherId/codes")
  @ApiOperation({ summary: "Sinh hàng loạt mã thẻ: { count, prefix?, length? }" })
  generateCodes(
    @Req() req: AppRequest,
    @Param("id") id: string,
    @Param("voucherId") voucherId: string,
    @Body() body: { count?: number; prefix?: string; length?: number },
  ) {
    return this.data.generateCodes(req.auth!, id, voucherId, body ?? {});
  }

  @Post("vouchers/:voucherId/codes/delete")
  @ApiOperation({ summary: "Xoá mã chưa dùng: { ids? } (bỏ trống = xoá hết mã chưa dùng)" })
  deleteCodes(
    @Req() req: AppRequest,
    @Param("id") id: string,
    @Param("voucherId") voucherId: string,
    @Body() body: { ids?: string[] },
  ) {
    return this.data.deleteCodes(req.auth!, id, voucherId, Array.isArray(body?.ids) ? body.ids.map(String) : undefined);
  }

  @Post(":collection")
  @ApiOperation({ summary: "Thêm lịch hẹn / sự kiện / tài liệu / hạng / voucher / đơn hàng (tạo tại quầy)" })
  create(@Req() req: AppRequest, @Param("id") id: string, @Param("collection") c: string, @Body() body: unknown) {
    return this.data.create(req.auth!, id, col(c), body);
  }

  @Patch(":collection/:itemId")
  @ApiOperation({ summary: "Sửa một bản ghi (đơn hàng: đổi trạng thái → tự cộng điểm khi hoàn thành)" })
  update(
    @Req() req: AppRequest,
    @Param("id") id: string,
    @Param("collection") c: string,
    @Param("itemId") itemId: string,
    @Body() body: unknown,
  ) {
    return this.data.update(req.auth!, id, col(c), itemId, body);
  }

  @Delete(":collection/:itemId")
  @ApiOperation({ summary: "Xoá một bản ghi" })
  remove(@Req() req: AppRequest, @Param("id") id: string, @Param("collection") c: string, @Param("itemId") itemId: string) {
    return this.data.remove(req.auth!, id, col(c), itemId);
  }
}
