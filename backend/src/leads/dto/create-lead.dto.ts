import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsIn, IsISO8601, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from "class-validator";

export const CALLBACK_SLOTS = ["08:00-10:00", "10:00-12:00", "13:30-15:30", "15:30-17:30", "19:00-21:00"];

export class CreateLeadDto {
  @ApiProperty({ example: "Nguyễn Văn A" })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: "Vui lòng nhập họ và tên" })
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: "0901234567" })
  @Transform(({ value }) => (typeof value === "string" ? value.replace(/\s+/g, "") : value))
  @IsString()
  @Matches(/^0\d{9}$/, { message: "Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0" })
  phone!: string;

  @ApiPropertyOptional({ example: "Thời trang" })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  industry?: string;

  @ApiPropertyOptional({ example: "thoi_trang_01" })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  templateId?: string;

  @ApiPropertyOptional({ example: "Cần làm Mini App bán hàng tích hợp Zalo OA" })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;

  @ApiPropertyOptional({ enum: ["consultation", "callback"], default: "consultation" })
  @IsOptional()
  @IsIn(["consultation", "callback"])
  requestType?: "consultation" | "callback";

  @ApiPropertyOptional({ example: "2026-11-21", description: "Ngày muốn được gọi lại (YYYY-MM-DD)" })
  @IsOptional()
  @IsISO8601({ strict: true })
  callbackDate?: string;

  @ApiPropertyOptional({ enum: CALLBACK_SLOTS })
  @IsOptional()
  @IsIn(CALLBACK_SLOTS, { message: "Khung giờ gọi lại không hợp lệ" })
  callbackSlot?: string;

  @ApiPropertyOptional({ example: "zalo_mini_app" })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  source?: string;

  /** Ô bẫy chống spam (ẩn trên form) — người thật để trống */
  @ApiPropertyOptional({ description: "Honeypot — luôn để trống" })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;

  @ApiPropertyOptional({ description: "Token từ GET /antispam/form-token" })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  formToken?: string;
}
