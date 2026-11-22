import { BadRequestException, Body, Controller, Get, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { AntiSpamService, clientIp } from "../antispam/antispam.service";
import { ApiHeader, ApiOperation, ApiProperty, ApiPropertyOptional, ApiQuery, ApiTags } from "@nestjs/swagger";
import { Prisma } from "@prisma/client";
import { IsNotEmpty, IsObject, IsOptional, IsString, MaxLength } from "class-validator";
import { AdminOnly, AppAuthGuard } from "../common/guards/app-auth.guard";
import { RateLimit, RateLimitGuard } from "../common/guards/rate-limit.guard";
import { PrismaService } from "../prisma/prisma.service";

export class CreateSubmissionDto {
  @ApiProperty({ example: "kcn_doanh_nghiep_01" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  templateId!: string;

  @ApiProperty({ example: "kcn_form" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  type!: string;

  @ApiProperty({ example: { employeeCode: "VN-2048", reason: "Quên chấm công ra" } })
  @IsObject()
  payload!: Record<string, unknown>;

  @ApiPropertyOptional({ description: "Honeypot — luôn để trống" })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;
}

@ApiTags("submissions")
@Controller("submissions")
export class SubmissionsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly antispam: AntiSpamService,
  ) {}

  @Post()
  @UseGuards(RateLimitGuard)
  @RateLimit(30, 600)
  @ApiOperation({ summary: "Lưu dữ liệu dùng thử từ các mẫu (đơn hàng, đặt lịch, đơn KCN...)" })
  async create(@Req() req: Request, @Body() dto: CreateSubmissionDto) {
    const raw = JSON.stringify(dto.payload);
    if (raw.length > 20000) throw new BadRequestException("Dữ liệu quá lớn");
    const verdict = await this.antispam.enforce({
      route: "submissions.create",
      ip: clientIp(req),
      honeypot: dto.website,
      texts: [raw.slice(0, 2000)],
      skipFormToken: true,
    });
    if (verdict.silent) return { id: "accepted" };
    return this.prisma.demoSubmission.create({
      data: {
        templateId: dto.templateId,
        type: dto.type,
        payload: dto.payload as Prisma.InputJsonValue,
      },
    });
  }

  @Get()
  @UseGuards(AppAuthGuard)
  @AdminOnly()
  @ApiHeader({ name: "x-admin-key", required: true })
  @ApiQuery({ name: "templateId", required: false })
  @ApiOperation({ summary: "Xem danh sách dữ liệu tương tác từ các mẫu (Admin)" })
  findAll(@Query("templateId") templateId?: string) {
    return this.prisma.demoSubmission.findMany({
      where: templateId ? { templateId } : undefined,
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }
}
