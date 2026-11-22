import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AdminOnly, AppAuthGuard } from "../common/guards/app-auth.guard";
import { CustomersService } from "./customers.service";
import { CreatePlatformCustomerDto, UpdatePlatformCustomerDto, UpsertStaffDto } from "./dto/customer.dto";

/** Quản lý khách hàng của nền tảng (người mua gói) — chỉ quản trị viên. */
@ApiTags("customers")
@ApiBearerAuth()
@UseGuards(AppAuthGuard)
@AdminOnly()
@Controller("customers")
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  findAll() {
    return this.customersService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.customersService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreatePlatformCustomerDto) {
    return this.customersService.create(dto);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdatePlatformCustomerDto) {
    return this.customersService.update(id, dto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.customersService.remove(id);
  }

  @Get(":id/store-customers")
  findStoreCustomers(@Param("id") id: string) {
    return this.customersService.findStoreCustomers(id);
  }

  @Post(":id/staff")
  addStaff(@Param("id") id: string, @Body() dto: UpsertStaffDto) {
    return this.customersService.addStaff(id, dto);
  }

  @Patch("staff/:staffId")
  updateStaff(@Param("staffId") staffId: string, @Body() dto: UpsertStaffDto) {
    return this.customersService.updateStaff(staffId, dto);
  }

  @Delete("staff/:staffId")
  removeStaff(@Param("staffId") staffId: string) {
    return this.customersService.removeStaff(staffId);
  }
}
