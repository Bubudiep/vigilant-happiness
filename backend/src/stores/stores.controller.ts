import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AppAuthGuard, RequireScopes, type AppRequest } from "../common/guards/app-auth.guard";
import { AuditService } from "../audit/audit.service";
import {
  CreateStoreDto,
  UpdateProductDto,
  UpdateStoreConfigDto,
  UpdateStoreCustomerDto,
  UpsertCustomerDto,
  UpsertProductDto,
} from "./dto/store.dto";
import { StoreDataService } from "./store-data.service";
import { StoresService } from "./stores.service";

@ApiTags("stores")
@Controller("stores")
export class StoresController {
  constructor(
    private readonly storesService: StoresService,
    private readonly audit: AuditService,
    private readonly storeData: StoreDataService,
  ) {}

  @Get("public/:slug")
  @ApiOperation({ summary: "Cấu hình Store công khai cho Zalo Mini App (không cần đăng nhập)" })
  findPublic(@Param("slug") slug: string) {
    return this.storesService.findPublicBySlug(slug);
  }

  @Get()
  @RequireScopes("stores:read")
  @UseGuards(AppAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Danh sách Store mà tài khoản được quản lý" })
  findAll(@Req() req: AppRequest) {
    return this.storesService.findAll(req.auth!);
  }

  @Get(":id")
  @RequireScopes("stores:read")
  @UseGuards(AppAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Chi tiết cấu hình Store, sản phẩm và tệp khách hàng" })
  async findOne(@Req() req: AppRequest, @Param("id") id: string) {
    const store = await this.storesService.findOne(req.auth!, id);
    return { ...store, ...(await this.storeData.loadAll(id)) };
  }

  @Post()
  @RequireScopes("stores:write")
  @UseGuards(AppAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Tạo mới Store Mini App" })
  create(@Req() req: AppRequest, @Body() dto: CreateStoreDto) {
    return this.storesService.create(req.auth!, dto);
  }

  @Patch(":id/config")
  @RequireScopes("stores:write")
  @UseGuards(AppAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Cập nhật thông tin, theme, slider và thiết kế (builderSchema) của Store" })
  async updateConfig(@Req() req: AppRequest, @Param("id") id: string, @Body() dto: UpdateStoreConfigDto) {
    const res = await this.storesService.updateConfig(req.auth!, id, dto);
    void this.audit.record(req, "store.update", { type: "store", id }, { fields: Object.keys(dto) });
    return res;
  }

  @Post(":id/products")
  @RequireScopes("stores:write")
  @UseGuards(AppAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Thêm sản phẩm / dịch vụ vào Store" })
  addProduct(@Req() req: AppRequest, @Param("id") id: string, @Body() dto: UpsertProductDto) {
    return this.storesService.addProduct(req.auth!, id, dto);
  }

  @Patch(":id/products/:productId")
  @RequireScopes("stores:write")
  @UseGuards(AppAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Cập nhật sản phẩm / dịch vụ" })
  updateProduct(
    @Req() req: AppRequest,
    @Param("id") id: string,
    @Param("productId") productId: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.storesService.updateProduct(req.auth!, id, productId, dto);
  }

  @Delete(":id/products/:productId")
  @RequireScopes("stores:write")
  @UseGuards(AppAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Xoá sản phẩm / dịch vụ" })
  removeProduct(@Req() req: AppRequest, @Param("id") id: string, @Param("productId") productId: string) {
    return this.storesService.removeProduct(req.auth!, id, productId);
  }

  @Post(":id/customers")
  @RequireScopes("stores:write")
  @UseGuards(AppAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Thêm khách hàng vào tệp khách hàng của Store" })
  addCustomer(@Req() req: AppRequest, @Param("id") id: string, @Body() dto: UpsertCustomerDto) {
    return this.storesService.addCustomer(req.auth!, id, dto);
  }

  @Patch(":id/customers/:customerId")
  @RequireScopes("stores:write")
  @UseGuards(AppAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Cập nhật thông tin / hạng / điểm khách hàng" })
  updateCustomer(
    @Req() req: AppRequest,
    @Param("id") id: string,
    @Param("customerId") customerId: string,
    @Body() dto: UpdateStoreCustomerDto,
  ) {
    return this.storesService.updateCustomer(req.auth!, id, customerId, dto);
  }

  @Delete(":id/customers/:customerId")
  @RequireScopes("stores:write")
  @UseGuards(AppAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Xoá khách hàng khỏi Store" })
  removeCustomer(@Req() req: AppRequest, @Param("id") id: string, @Param("customerId") customerId: string) {
    return this.storesService.removeCustomer(req.auth!, id, customerId);
  }
}
