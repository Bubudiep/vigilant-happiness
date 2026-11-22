import { IsArray, IsBoolean, IsDateString, IsInt, IsOptional, IsString, MaxLength, Min } from "class-validator";

export class UpsertPlanDto {
  @IsString()
  @MaxLength(40)
  code!: string;

  @IsString()
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  @IsInt()
  @Min(0)
  priceMonthly!: number;

  @IsInt()
  @Min(0)
  priceYearly!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxStores?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxProducts?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxStaff?: number;

  @IsOptional()
  @IsArray()
  features?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class CreateSubscriptionDto {
  @IsString()
  customerId!: string;

  @IsString()
  planId!: string;

  @IsOptional()
  @IsString()
  billingCycle?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  pricePaid?: number;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsDateString()
  startedAt?: string;

  @IsDateString()
  expiresAt!: string;

  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class UpdateSubscriptionDto {
  @IsOptional()
  @IsString()
  planId?: string;

  @IsOptional()
  @IsString()
  billingCycle?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  pricePaid?: number;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
