import { ApiProperty, ApiPropertyOptional, OmitType, PartialType } from "@nestjs/swagger";
import { IsArray, IsIn, IsInt, IsISO8601, IsOptional, IsString, Max, MaxLength, Min, MinLength, ValidateIf } from "class-validator";

export const PROJECT_STATUSES = ["consulting", "designing", "developing", "testing", "zalo_review", "live", "maintenance", "paused"];
export const TICKET_STATUSES = ["open", "in_progress", "waiting_customer", "resolved", "closed"];
export const TICKET_CATEGORIES = ["technical", "zalo_review", "billing", "feature", "content"];
export const TICKET_PRIORITIES = ["low", "normal", "high", "urgent"];

// ───── Khách hàng (Mini App) ─────

export class CreateTicketDto {
  @ApiProperty({ example: "Ảnh banner bị mờ trên iPhone" })
  @IsString()
  @MinLength(5, { message: "Tiêu đề tối thiểu 5 ký tự" })
  @MaxLength(150)
  subject!: string;

  @ApiProperty({ example: "Banner trang chủ hiển thị mờ, nhờ kiểm tra giúp" })
  @IsString()
  @MinLength(10, { message: "Mô tả tối thiểu 10 ký tự" })
  @MaxLength(4000)
  body!: string;

  @ApiPropertyOptional({ enum: TICKET_CATEGORIES })
  @IsOptional()
  @IsIn(TICKET_CATEGORIES)
  category?: string;

  @ApiPropertyOptional({ enum: ["low", "normal", "high"] })
  @IsOptional()
  @IsIn(["low", "normal", "high"])
  priority?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() projectId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() storeId?: string;

  /** Chống spam */
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) website?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) formToken?: string;
}

export class TicketReplyDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  body!: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) website?: string;
}

// ───── Quản trị ─────

export class CreateProjectDto {
  @ApiProperty() @IsString() customerId!: string;
  @ApiProperty({ example: "Mini App LUMI Studio" }) @IsString() @MaxLength(150) name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) templateId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() storeId?: string;
  @ApiPropertyOptional({ enum: PROJECT_STATUSES }) @IsOptional() @IsIn(PROJECT_STATUSES) status?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(100) progress?: number;
  @ApiPropertyOptional() @IsOptional() @IsISO8601() startDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsISO8601() dueDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) note?: string;

  @ApiPropertyOptional({ description: "Tạo sẵn các mốc công việc", example: ["Chốt yêu cầu", "Thiết kế giao diện"] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  milestones?: string[];
}

/**
 * Sửa dự án. `storeId`, `startDate`, `dueDate` nhận `null` (hoặc "") để bỏ gán / xoá ngày;
 * không gửi trường = giữ nguyên.
 */
export class UpdateProjectDto extends PartialType(OmitType(CreateProjectDto, ["storeId", "startDate", "dueDate"] as const)) {
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @ValidateIf((_, v) => v !== null) @IsString() storeId?: string | null;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @ValidateIf((_, v) => v !== null && v !== "") @IsISO8601() startDate?: string | null;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @ValidateIf((_, v) => v !== null && v !== "") @IsISO8601() dueDate?: string | null;
}

export class CreateMilestoneDto {
  @ApiProperty() @IsString() @MaxLength(150) title!: string;
  @ApiPropertyOptional({ enum: ["todo", "doing", "done"] }) @IsOptional() @IsIn(["todo", "doing", "done"]) status?: string;
  @ApiPropertyOptional() @IsOptional() @IsISO8601() dueDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() sortOrder?: number;
}

export class UpdateMilestoneDto extends PartialType(CreateMilestoneDto) {}

export class AdminUpdateTicketDto {
  @ApiPropertyOptional({ enum: TICKET_STATUSES }) @IsOptional() @IsIn(TICKET_STATUSES) status?: string;
  @ApiPropertyOptional({ enum: TICKET_PRIORITIES }) @IsOptional() @IsIn(TICKET_PRIORITIES) priority?: string;
}

export class StaffReplyDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(4000) body!: string;
  @ApiPropertyOptional({ enum: TICKET_STATUSES, description: "Đổi trạng thái cùng lúc, mặc định waiting_customer" })
  @IsOptional()
  @IsIn(TICKET_STATUSES)
  status?: string;
}
