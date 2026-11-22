import { Type } from "class-transformer";
import { IsDateString, IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

export class CreateDebtDto {
  @IsString()
  customerId!: string;

  @IsString()
  @MaxLength(200)
  title!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100_000_000_000)
  amount!: number;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class UpdateDebtDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100_000_000_000)
  amount?: number;

  /** Chuỗi rỗng = bỏ hạn thanh toán. */
  @IsOptional()
  @IsString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class AddPaymentDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  amount!: number;

  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  method?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}
