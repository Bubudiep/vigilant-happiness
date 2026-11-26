import { PartialType } from "@nestjs/swagger";
import { IsArray, IsBoolean, IsIn, IsInt, IsObject, IsOptional, IsString, Matches, Max, MaxLength, Min } from "class-validator";

export class CreateStoreDto {
  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  subscriptionId?: string;

  @IsString()
  @MaxLength(100)
  name!: string;

  @IsString()
  @MaxLength(80)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: "slug chỉ gồm chữ thường, số và dấu gạch ngang" })
  slug!: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  subtitle?: string;

  @IsString()
  @MaxLength(60)
  templateId!: string;

  @IsOptional()
  @IsString()
  zaloAppId?: string;

  @IsOptional()
  @IsString()
  zaloOaId?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  coverUrl?: string;

  @IsOptional()
  @IsObject()
  theme?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  sliders?: Record<string, unknown>[];

  @IsOptional()
  @IsObject()
  builderSchema?: Record<string, unknown>;
}

export class UpdateStoreConfigDto {
  /** Chỉ quản trị nền tảng: chuyển store sang khách hàng khác (null = bỏ gắn) */
  @IsOptional()
  @IsString()
  customerId?: string | null;

  /** Chỉ quản trị nền tảng: gắn gói đăng ký của khách (null = bỏ gắn) */
  @IsOptional()
  @IsString()
  subscriptionId?: string | null;

  /** App Secret Mini App riêng của store (chỉ ghi, không đọc lại được). Chuỗi rỗng = xoá. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  zaloAppSecret?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  subtitle?: string;

  @IsOptional()
  @IsString()
  templateId?: string;

  @IsOptional()
  @IsString()
  zaloAppId?: string;

  @IsOptional()
  @IsString()
  zaloOaId?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  coverUrl?: string;

  @IsOptional()
  @IsObject()
  theme?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  sliders?: Record<string, unknown>[];

  @IsOptional()
  @IsObject()
  builderSchema?: Record<string, unknown>;
}

export class UpsertProductDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  sku?: string;

  /** product = hàng hoá (có tồn kho) | service = dịch vụ (không quản lý kho) | material = nguyên liệu */
  @IsOptional()
  @IsIn(["product", "service", "material"])
  kind?: "product" | "service" | "material";

  /** Giá vốn (đ / đơn vị) — bỏ qua nếu có định mức BOM */
  @IsOptional()
  @IsInt()
  @Min(0)
  costPrice?: number;

  /** Định mức nguyên liệu: [{ productId, quantity }] */
  @IsOptional()
  @IsArray()
  bom?: { productId: string; quantity: number }[] | null;

  /** Phân loại & bán kèm (size, topping…) */
  @IsOptional()
  @IsArray()
  options?: unknown[] | null;

  /** Combo: { items: [{ productId, quantity }], discountType: "amount" | "percent", discountValue } — null = bỏ combo */
  @IsOptional()
  @IsObject()
  combo?: { items: { productId: string; quantity: number }[]; discountType: "amount" | "percent"; discountValue: number } | null;

  @IsString()
  @MaxLength(140)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsInt()
  @Min(0)
  price!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  salePrice?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;

  /** Thời lượng dịch vụ (phút) */
  @IsOptional()
  @IsInt()
  @Min(0)
  durationMin?: number | null;

  /** Liệu trình mặc định (dịch vụ): số buổi, số ngày giữa 2 buổi */
  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(100)
  treatmentSessions?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  treatmentIntervalDays?: number | null;

  @IsOptional()
  @IsArray()
  gallery?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(40)
  unit?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  tag?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpsertCustomerDto {
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsString()
  @MaxLength(20)
  phone!: string;

  @IsOptional()
  @IsString()
  tier?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  points?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  totalOrders?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  totalSpent?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

/** Dùng cho PATCH: mọi trường đều tuỳ chọn nhưng vẫn được validate + whitelist. */
export class UpdateProductDto extends PartialType(UpsertProductDto) {}
export class UpdateStoreCustomerDto extends PartialType(UpsertCustomerDto) {}
