import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AdminOnly, AppAuthGuard, RequireScopes, type AppRequest } from "../common/guards/app-auth.guard";
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

  @Delete(":id")
  @AdminOnly()
  @UseGuards(AppAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Xoá hẳn gian hàng: dữ liệu DB + mọi file ảnh trên ổ (chỉ quản trị nền tảng)" })
  async remove(@Req() req: AppRequest, @Param("id") id: string) {
    const r = await this.storesService.removeStore(id);
    void this.audit.record(req, "store.delete", { type: "store", id }, { name: r.name, files: r.files });
    return r;
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
  async addProduct(@Req() req: AppRequest, @Param("id") id: string, @Body() dto: UpsertProductDto) {
    const p = await this.storesService.addProduct(req.auth!, id, dto);
    void this.audit.record(req, "store.product.add", { type: "store", id }, { productId: p.id, name: p.name });
    return p;
  }

  @Patch(":id/products/:productId")
  @RequireScopes("stores:write")
  @UseGuards(AppAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Cập nhật sản phẩm / dịch vụ" })
  async updateProduct(
    @Req() req: AppRequest,
    @Param("id") id: string,
    @Param("productId") productId: string,
    @Body() dto: UpdateProductDto,
  ) {
    const p = await this.storesService.updateProduct(req.auth!, id, productId, dto);
    void this.audit.record(req, "store.product.update", { type: "store", id }, { productId, fields: Object.keys(dto) });
    return p;
  }

  @Delete(":id/products/:productId")
  @RequireScopes("stores:write")
  @UseGuards(AppAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Xoá sản phẩm / dịch vụ" })
  async removeProduct(@Req() req: AppRequest, @Param("id") id: string, @Param("productId") productId: string) {
    const r = await this.storesService.removeProduct(req.auth!, id, productId);
    void this.audit.record(req, "store.product.remove", { type: "store", id }, { productId });
    return r;
  }

  @Post(":id/customers")
  @RequireScopes("stores:write")
  @UseGuards(AppAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Thêm khách hàng vào tệp khách hàng của Store" })
  async addCustomer(@Req() req: AppRequest, @Param("id") id: string, @Body() dto: UpsertCustomerDto) {
    const c = await this.storesService.addCustomer(req.auth!, id, dto);
    void this.audit.record(req, "store.customer.add", { type: "store", id }, { customerId: c.id });
    return c;
  }

  @Patch(":id/customers/:customerId")
  @RequireScopes("stores:write")
  @UseGuards(AppAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Cập nhật thông tin / hạng / điểm khách hàng" })
  async updateCustomer(
    @Req() req: AppRequest,
    @Param("id") id: string,
    @Param("customerId") customerId: string,
    @Body() dto: UpdateStoreCustomerDto,
  ) {
    const c = await this.storesService.updateCustomer(req.auth!, id, customerId, dto);
    void this.audit.record(req, "store.customer.update", { type: "store", id }, { customerId, fields: Object.keys(dto) });
    return c;
  }

  @Delete(":id/customers/:customerId")
  @RequireScopes("stores:write")
  @UseGuards(AppAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Xoá khách hàng khỏi Store" })
  async removeCustomer(@Req() req: AppRequest, @Param("id") id: string, @Param("customerId") customerId: string) {
    const r = await this.storesService.removeCustomer(req.auth!, id, customerId);
    void this.audit.record(req, "store.customer.remove", { type: "store", id }, { customerId });
    return r;
  }
}
