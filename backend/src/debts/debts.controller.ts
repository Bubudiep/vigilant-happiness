import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AuditService } from "../audit/audit.service";
import { AdminOnly, AppAuthGuard, type AppRequest } from "../common/guards/app-auth.guard";
import { DebtsService } from "./debts.service";
import { AddPaymentDto, CreateDebtDto, UpdateDebtDto } from "./dto/debt.dto";

/** Công nợ khách hàng nền tảng — chỉ quản trị viên. */
@ApiTags("debts")
@ApiBearerAuth()
@UseGuards(AppAuthGuard)
@AdminOnly()
@Controller("debts")
export class DebtsController {
  constructor(
    private readonly debts: DebtsService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  findAll(@Query("customerId") customerId?: string, @Query("status") status?: string) {
    return this.debts.findAll({ customerId, status });
  }

  @Post()
  async create(@Req() req: AppRequest, @Body() dto: CreateDebtDto) {
    const d = await this.debts.create(dto);
    void this.audit.record(req, "debt.create", { type: "debt", id: d.id }, { customerId: dto.customerId, amount: dto.amount });
    return d;
  }

  @Patch(":id")
  async update(@Req() req: AppRequest, @Param("id") id: string, @Body() dto: UpdateDebtDto) {
    const d = await this.debts.update(id, dto);
    void this.audit.record(req, "debt.update", { type: "debt", id }, { fields: Object.keys(dto) });
    return d;
  }

  @Delete("payments/:paymentId")
  async removePayment(@Req() req: AppRequest, @Param("paymentId") paymentId: string) {
    const d = await this.debts.removePayment(paymentId);
    void this.audit.record(req, "debt.payment_delete", { type: "debt", id: d.id }, { paymentId });
    return d;
  }

  @Delete(":id")
  async remove(@Req() req: AppRequest, @Param("id") id: string) {
    const r = await this.debts.remove(id);
    void this.audit.record(req, "debt.delete", { type: "debt", id });
    return r;
  }

  @Post(":id/payments")
  async addPayment(@Req() req: AppRequest, @Param("id") id: string, @Body() dto: AddPaymentDto) {
    const d = await this.debts.addPayment(id, dto);
    void this.audit.record(req, "debt.payment", { type: "debt", id }, { amount: dto.amount, method: dto.method });
    return d;
  }
}
