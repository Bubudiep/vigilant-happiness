import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AuditService } from "../audit/audit.service";
import { AdminOnly, AppAuthGuard, type AppRequest } from "../common/guards/app-auth.guard";
import { CustomersService } from "./customers.service";
import { CreatePlatformCustomerDto, UpdatePlatformCustomerDto, UpsertStaffDto } from "./dto/customer.dto";

/** Quản lý khách hàng của nền tảng (người mua gói) — chỉ quản trị viên. */
@ApiTags("customers")
@ApiBearerAuth()
@UseGuards(AppAuthGuard)
@AdminOnly()
@Controller("customers")
export class CustomersController {
  constructor(
    private readonly customersService: CustomersService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  findAll() {
    return this.customersService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.customersService.findOne(id);
  }

  @Post()
  async create(@Req() req: AppRequest, @Body() dto: CreatePlatformCustomerDto) {
    const c = await this.customersService.create(dto);
    void this.audit.record(req, "customer.create", { type: "customer", id: c.id }, { name: dto.name });
    return c;
  }

  @Patch(":id")
  async update(@Req() req: AppRequest, @Param("id") id: string, @Body() dto: UpdatePlatformCustomerDto) {
    const c = await this.customersService.update(id, dto);
    void this.audit.record(req, "customer.update", { type: "customer", id }, { fields: Object.keys(dto), status: (dto as { status?: string }).status });
    return c;
  }

  @Delete(":id")
  async remove(@Req() req: AppRequest, @Param("id") id: string) {
    const r = await this.customersService.remove(id);
    void this.audit.record(req, "customer.delete", { type: "customer", id });
    return r;
  }

  @Get(":id/store-customers")
  findStoreCustomers(@Param("id") id: string) {
    return this.customersService.findStoreCustomers(id);
  }

  @Post(":id/staff")
  async addStaff(@Req() req: AppRequest, @Param("id") id: string, @Body() dto: UpsertStaffDto) {
    const st = await this.customersService.addStaff(id, dto);
    void this.audit.record(req, "customer.staff.add", { type: "customer", id }, { staffId: st.id, name: dto.name });
    return st;
  }

  @Patch("staff/:staffId")
  async updateStaff(@Req() req: AppRequest, @Param("staffId") staffId: string, @Body() dto: UpsertStaffDto) {
    const st = await this.customersService.updateStaff(staffId, dto);
    void this.audit.record(req, "customer.staff.update", { type: "staff", id: staffId }, { fields: Object.keys(dto) });
    return st;
  }

  @Delete("staff/:staffId")
  async removeStaff(@Req() req: AppRequest, @Param("staffId") staffId: string) {
    const r = await this.customersService.removeStaff(staffId);
    void this.audit.record(req, "customer.staff.remove", { type: "staff", id: staffId });
    return r;
  }
}
