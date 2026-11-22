import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags } from "@nestjs/swagger";
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";
import { AdminOnly, AppAuthGuard, type AppRequest } from "../common/guards/app-auth.guard";
import { RateLimit, RateLimitGuard } from "../common/guards/rate-limit.guard";
import { AuditService } from "../audit/audit.service";
import { AntiSpamService } from "./antispam.service";

export class CreateSpamBlockDto {
  @ApiProperty({ enum: ["ip", "phone", "user"] })
  @IsIn(["ip", "phone", "user"])
  kind!: string;

  @ApiProperty({ example: "0901234567" })
  @IsString()
  @MaxLength(100)
  value!: string;

  @ApiProperty({ example: "Gửi quảng cáo vay tiền" })
  @IsString()
  @MaxLength(200)
  reason!: string;

  @ApiPropertyOptional({ description: "Số giờ chặn, bỏ trống = vĩnh viễn" })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(24 * 365)
  hours?: number;
}

@ApiTags("antispam")
@Controller("antispam")
export class AntiSpamController {
  constructor(
    private readonly antispam: AntiSpamService,
    private readonly audit: AuditService,
  ) {}

  @Get("form-token")
  @UseGuards(RateLimitGuard)
  @RateLimit(60, 600)
  @ApiOperation({ summary: "Lấy token khi mở form (bắt buộc gửi kèm khi submit form công khai)" })
  formToken() {
    return this.antispam.issueFormToken();
  }

  @Get("stats")
  @UseGuards(AppAuthGuard)
  @AdminOnly()
  @ApiBearerAuth()
  stats() {
    return this.antispam.stats();
  }

  @Get("events")
  @UseGuards(AppAuthGuard)
  @AdminOnly()
  @ApiBearerAuth()
  @ApiOperation({ summary: "Nhật ký request bị chặn / nghi spam" })
  events(@Query("action") action?: string, @Query("ip") ip?: string) {
    return this.antispam.listEvents({ action, ip });
  }

  @Get("blocks")
  @UseGuards(AppAuthGuard)
  @AdminOnly()
  @ApiBearerAuth()
  blocks() {
    return this.antispam.listBlocks();
  }

  @Post("blocks")
  @UseGuards(AppAuthGuard)
  @AdminOnly()
  @ApiBearerAuth()
  @ApiOperation({ summary: "Chặn IP / SĐT / tài khoản" })
  async addBlock(@Req() req: AppRequest, @Body() dto: CreateSpamBlockDto) {
    const b = await this.antispam.addBlock(dto.kind, dto.value.trim(), dto.reason, dto.hours);
    void this.audit.record(req, "spam.block.add", { type: dto.kind, id: dto.value.trim() }, { reason: dto.reason, hours: dto.hours });
    return b;
  }

  @Delete("blocks/:id")
  @UseGuards(AppAuthGuard)
  @AdminOnly()
  @ApiBearerAuth()
  async removeBlock(@Req() req: AppRequest, @Param("id") id: string) {
    const b = await this.antispam.removeBlock(id);
    void this.audit.record(req, "spam.block.remove", { type: b.kind, id: b.value });
    return b;
  }
}
