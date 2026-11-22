import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AddPaymentDto, CreateDebtDto, UpdateDebtDto } from "./dto/debt.dto";

export type DebtStatus = "unpaid" | "partial" | "paid" | "overdue";

/** Trạng thái tính từ số tiền: paid = đã thu đủ; overdue = còn nợ và hết ngày hạn (so theo ngày). */
export function debtStatus(amount: number, paid: number, dueDate: Date | null, now = new Date()): DebtStatus {
  if (paid >= amount) return "paid";
  if (dueDate) {
    const endOfDue = new Date(dueDate);
    endOfDue.setHours(23, 59, 59, 999);
    if (endOfDue < now) return "overdue";
  }
  return paid > 0 ? "partial" : "unpaid";
}

const include = {
  customer: { select: { id: true, name: true, companyName: true, phone: true } },
  payments: { orderBy: { paidAt: "desc" as const } },
};

@Injectable()
export class DebtsService {
  constructor(private readonly prisma: PrismaService) {}

  private view<T extends { amount: number; dueDate: Date | null; payments: { amount: number }[] }>(d: T) {
    const paid = d.payments.reduce((s, p) => s + p.amount, 0);
    return { ...d, paid, remaining: Math.max(0, d.amount - paid), status: debtStatus(d.amount, paid, d.dueDate) };
  }

  async findAll(opts: { customerId?: string; status?: string } = {}) {
    const rows = await this.prisma.debt.findMany({
      where: opts.customerId ? { customerId: opts.customerId } : undefined,
      include,
      orderBy: { createdAt: "desc" },
    });
    const list = rows.map((d) => this.view(d));
    const filtered = opts.status ? list.filter((d) => d.status === opts.status) : list;
    const open = list.filter((d) => d.status !== "paid");
    const overdue = list.filter((d) => d.status === "overdue");
    return {
      items: filtered,
      summary: {
        totalDebt: open.reduce((s, d) => s + d.remaining, 0),
        overdueAmount: overdue.reduce((s, d) => s + d.remaining, 0),
        overdueCount: overdue.length,
        debtorCount: new Set(open.map((d) => d.customerId)).size,
        collectedTotal: list.reduce((s, d) => s + d.paid, 0),
      },
    };
  }

  async findOne(id: string) {
    const d = await this.prisma.debt.findUnique({ where: { id }, include });
    if (!d) throw new NotFoundException("Không tìm thấy khoản nợ");
    return this.view(d);
  }

  async create(dto: CreateDebtDto) {
    const c = await this.prisma.platformCustomer.findUnique({ where: { id: dto.customerId }, select: { id: true } });
    if (!c) throw new NotFoundException("Không tìm thấy khách hàng");
    const d = await this.prisma.debt.create({
      data: {
        customerId: dto.customerId,
        title: dto.title.trim(),
        amount: dto.amount,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        note: dto.note?.trim() || null,
      },
      include,
    });
    return this.view(d);
  }

  async update(id: string, dto: UpdateDebtDto) {
    const cur = await this.findOne(id);
    if (dto.amount !== undefined && dto.amount < cur.paid) {
      throw new BadRequestException(`Số nợ không được nhỏ hơn số đã thu (${cur.paid})`);
    }
    const d = await this.prisma.debt.update({
      where: { id },
      data: {
        title: dto.title?.trim(),
        amount: dto.amount,
        dueDate: dto.dueDate === undefined ? undefined : dto.dueDate ? new Date(dto.dueDate) : null,
        note: dto.note === undefined ? undefined : dto.note.trim() || null,
      },
      include,
    });
    return this.view(d);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.debt.delete({ where: { id } });
    return { deleted: true };
  }

  /** Ghi nhận thu tiền; kiểm tra "còn lại" trong transaction Serializable để không thu vượt khi bấm đồng thời. */
  async addPayment(id: string, dto: AddPaymentDto) {
    await this.prisma.$transaction(
      async (tx) => {
        const d = await tx.debt.findUnique({ where: { id }, include: { payments: true } });
        if (!d) throw new NotFoundException("Không tìm thấy khoản nợ");
        const paid = d.payments.reduce((s, p) => s + p.amount, 0);
        if (dto.amount > d.amount - paid) throw new BadRequestException(`Vượt quá số còn nợ (${d.amount - paid})`);
        await tx.debtPayment.create({
          data: {
            debtId: id,
            amount: dto.amount,
            paidAt: dto.paidAt ? new Date(dto.paidAt) : undefined,
            method: dto.method?.trim() || null,
            note: dto.note?.trim() || null,
          },
        });
      },
      { isolationLevel: "Serializable" },
    );
    return this.findOne(id);
  }

  async removePayment(paymentId: string) {
    const p = await this.prisma.debtPayment.findUnique({ where: { id: paymentId } });
    if (!p) throw new NotFoundException("Không tìm thấy lần thu");
    await this.prisma.debtPayment.delete({ where: { id: paymentId } });
    return this.findOne(p.debtId);
  }
}
