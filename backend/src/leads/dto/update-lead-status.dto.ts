import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { LeadStatus } from "@prisma/client";
import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateLeadStatusDto {
  @ApiProperty({ enum: LeadStatus })
  @IsEnum(LeadStatus)
  status!: LeadStatus;
}

export class UpdateLeadDto {
  @ApiPropertyOptional({ enum: LeadStatus })
  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;

  @ApiPropertyOptional({ example: "Đã gọi, hẹn gửi báo giá thứ 6" })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  staffNote?: string;

  @ApiPropertyOptional({ description: "true = đánh dấu spam, false = không phải spam" })
  @IsOptional()
  @IsBoolean()
  spam?: boolean;
}
