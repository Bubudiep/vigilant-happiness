import { IsBoolean, IsDateString, IsIn, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateConversationDto {
  @IsOptional()
  @IsIn(["open", "closed"])
  status?: string;

  /** null / chuỗi rỗng = bỏ gắn khách hàng */
  @IsOptional()
  @IsString()
  customerId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayName?: string;
}

export class UpdateAttachmentDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  tag?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;

  @IsOptional()
  @IsString()
  customerId?: string | null;
}

export class CreateCareDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsDateString()
  dueAt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  conversationId?: string;
}

export class UpdateCareDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @IsOptional()
  @IsDateString()
  dueAt?: string;

  @IsOptional()
  @IsBoolean()
  done?: boolean;
}

export class OaCredentialsDto {
  @IsString()
  @MaxLength(2000)
  accessToken!: string;

  @IsString()
  @MaxLength(2000)
  refreshToken!: string;
}

export class StoreOaDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  oaId?: string;

  /** OA Secret Key — chuỗi rỗng = xoá */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  oaSecret?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  accessToken?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  refreshToken?: string;
}
