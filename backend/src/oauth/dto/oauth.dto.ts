import { ApiPropertyOptional, ApiProperty, PartialType, OmitType } from "@nestjs/swagger";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";

const GRANTS = ["client_credentials", "refresh_token", "zalo_mini_app"];
const CHANNELS = ["zalo_mini_app", "web", "pos", "api", "webhook"];

/** Body của POST /oauth/token (form-urlencoded hoặc JSON), tên trường theo chuẩn OAuth 2.0. */
export class TokenRequestDto {
  @ApiProperty({ enum: GRANTS })
  @IsString()
  @IsIn(GRANTS, { message: "unsupported_grant_type" })
  grant_type!: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) client_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) client_secret?: string;
  @ApiPropertyOptional({ example: "stores:read leads:write" }) @IsOptional() @IsString() @MaxLength(500) scope?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) refresh_token?: string;

  @ApiPropertyOptional({ description: "Kết quả getAccessToken() trong Mini App" })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  zalo_access_token?: string;

  @ApiPropertyOptional({ description: "token từ getPhoneNumber() trong Mini App (hết hạn sau ~2 phút)" })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  phone_token?: string;
}

export class RevokeRequestDto {
  @ApiProperty() @IsString() @MaxLength(200) token!: string;
  @ApiPropertyOptional({ enum: ["access_token", "refresh_token"] })
  @IsOptional()
  @IsIn(["access_token", "refresh_token"])
  token_type_hint?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) client_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) client_secret?: string;
}

export class IntrospectRequestDto {
  @ApiProperty() @IsString() @MaxLength(200) token!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) client_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) client_secret?: string;
}

export class CreateOAuthAppDto {
  @ApiProperty({ example: "Mini App LUMI Studio" })
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ enum: CHANNELS, default: "api" })
  @IsOptional()
  @IsIn(CHANNELS)
  channel?: string;

  @ApiPropertyOptional({ enum: ["confidential", "public"] })
  @IsOptional()
  @IsIn(["confidential", "public"])
  clientType?: "confidential" | "public";

  @ApiPropertyOptional({ enum: GRANTS, isArray: true })
  @IsOptional()
  @IsArray()
  @IsIn(GRANTS, { each: true })
  grantTypes?: string[];

  @ApiPropertyOptional({ example: ["stores:read", "leads:write"] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  scopes?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  redirectUris?: string[];

  @ApiPropertyOptional({ description: "Chỉ quản trị viên được chỉ định" })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() storeId?: string;

  @ApiPropertyOptional({ default: 3600 })
  @IsOptional()
  @IsInt()
  @Min(300)
  @Max(86400)
  accessTokenTtl?: number;

  @ApiPropertyOptional({ default: 2592000 })
  @IsOptional()
  @IsInt()
  @Min(3600)
  @Max(31536000)
  refreshTokenTtl?: number;
}

export class UpdateOAuthAppDto extends PartialType(OmitType(CreateOAuthAppDto, ["channel", "clientType", "customerId"] as const)) {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() active?: boolean;
}
