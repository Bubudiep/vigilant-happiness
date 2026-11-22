import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateBuildDto {
  /** Tên Mini App muốn hiển thị trên Zalo */
  @IsOptional()
  @IsString()
  @MaxLength(80)
  appName?: string;

  /** Zalo Mini App ID đã tạo ở mini.zalo.me (nếu đã có) */
  @IsOptional()
  @IsString()
  @MaxLength(40)
  appId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class ReviewBuildDto {
  /** approve: reMini duyệt (→ chờ Zalo duyệt) · publish: đã phát hành · reject: từ chối (cần lý do) */
  @IsIn(["approve", "publish", "reject"])
  action!: "approve" | "publish" | "reject";

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  adminNote?: string;

  /** Khi phát hành: Mini App ID thật (cập nhật vào gian hàng) */
  @IsOptional()
  @IsString()
  @MaxLength(40)
  appId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  publishedUrl?: string;
}
