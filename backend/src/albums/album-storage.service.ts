import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import * as fs from "fs";
import * as path from "path";
import sharp = require("sharp");
import { sniffImageMime } from "../inbox/files.service";

export const MAX_ALBUM_PHOTO_BYTES = 10 * 1024 * 1024;
/** Ảnh xem trước: cạnh dài tối đa 2048px, WebP q80 (~300–500KB). Ảnh gốc giao qua link Drive/... */
const PREVIEW_MAX_SIDE = 2048;
const PREVIEW_QUALITY = 80;
const THUMB_MAX_SIDE = 400;
const THUMB_QUALITY = 72;
/** Giới hạn pixel đầu vào (chống "ảnh bom" giải nén tốn RAM). */
const MAX_INPUT_PIXELS = 80_000_000;
const EXT: Record<string, string> = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif" };

/** Đọc kích thước ảnh JPEG/PNG/WebP từ header (không cần thư viện ảnh). */
export function imageSize(buf: Buffer, mime: string): { width: number; height: number } | null {
  try {
    if (mime === "image/png") return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
    if (mime === "image/gif") return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
    if (mime === "image/webp") {
      const kind = buf.subarray(12, 16).toString("ascii");
      if (kind === "VP8X") return { width: 1 + buf.readUIntLE(24, 3), height: 1 + buf.readUIntLE(27, 3) };
      if (kind === "VP8 ") return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
      if (kind === "VP8L") {
        const b = buf.readUInt32LE(21);
        return { width: (b & 0x3fff) + 1, height: ((b >> 14) & 0x3fff) + 1 };
      }
      return null;
    }
    if (mime === "image/jpeg") {
      let i = 2;
      while (i < buf.length) {
        if (buf[i] !== 0xff) return null;
        const marker = buf[i + 1];
        const len = buf.readUInt16BE(i + 2);
        if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
          return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
        }
        i += 2 + len;
      }
    }
  } catch {
    // header hỏng
  }
  return null;
}

/**
 * Lưu ảnh album ở `uploads-private/albums/` (không phục vụ tĩnh).
 * Xem qua URL ký HMAC có hạn: `/api/album-photos/:id?exp=...&sig=...`.
 */
@Injectable()
export class AlbumStorageService {
  private readonly dir = path.join(process.cwd(), "uploads-private", "albums");

  private readonly thumbDir = path.join(this.dir, "thumbs");

  constructor(private readonly config: ConfigService) {
    fs.mkdirSync(this.thumbDir, { recursive: true });
  }

  private mac(id: string, exp: number) {
    const secret = this.config.get<string>("FILE_SIGN_SECRET") || this.config.get<string>("JWT_SECRET") || "dev-only-secret";
    return createHmac("sha256", secret).update(`album.${id}.${exp}`).digest("hex");
  }

  private origin() {
    const port = this.config.get<number>("PORT") ?? 4000;
    return (this.config.get<string>("PUBLIC_API_ORIGIN") || `http://localhost:${port}`).replace(/\/+$/, "");
  }

  /** URL tuyệt đối có chữ ký, mặc định sống 2 giờ. */
  signedUrl(id: string, ttlSec = 7200): string {
    const exp = Math.floor(Date.now() / 1000) + ttlSec;
    return `${this.origin()}/api/album-photos/${id}?exp=${exp}&sig=${this.mac(id, exp)}`;
  }

  verify(id: string, exp?: string, sig?: string): boolean {
    const e = Number(exp);
    if (!sig || !Number.isFinite(e) || e < Date.now() / 1000) return false;
    const want = Buffer.from(this.mac(id, e));
    const got = Buffer.from(sig);
    return want.length === got.length && timingSafeEqual(want, got);
  }

  /**
   * Nén ảnh (xoay theo EXIF, thu về ≤ 2048px, WebP) + tạo thumbnail 400px.
   * GIF (có thể động) giữ nguyên bản. Xử lý tuần tự nên RAM dùng ít.
   */
  async write(buf: Buffer) {
    if (!buf?.length) throw new BadRequestException("Không nhận được file");
    if (buf.length > MAX_ALBUM_PHOTO_BYTES) throw new BadRequestException("Ảnh quá lớn (tối đa 10MB)");
    const mime = sniffImageMime(buf);
    if (!mime) throw new BadRequestException("Chỉ nhận ảnh JPG, PNG, WebP hoặc GIF");
    const id = randomBytes(16).toString("hex");

    if (mime === "image/gif") {
      const storageKey = id + EXT[mime];
      await fs.promises.writeFile(path.join(this.dir, storageKey), buf, { flag: "wx" });
      await this.makeThumb(buf, storageKey).catch(() => undefined);
      return { storageKey, mime, size: buf.length, ...(imageSize(buf, mime) ?? {}) };
    }

    let out: { data: Buffer; info: { width: number; height: number } };
    try {
      out = await sharp(buf, { limitInputPixels: MAX_INPUT_PIXELS, failOn: "error" })
        .rotate()
        .resize({ width: PREVIEW_MAX_SIDE, height: PREVIEW_MAX_SIDE, fit: "inside", withoutEnlargement: true })
        .webp({ quality: PREVIEW_QUALITY, effort: 4 })
        .toBuffer({ resolveWithObject: true });
    } catch {
      throw new BadRequestException("Ảnh hỏng hoặc quá lớn, không xử lý được");
    }
    const storageKey = id + ".webp";
    await fs.promises.writeFile(path.join(this.dir, storageKey), out.data, { flag: "wx" });
    await this.makeThumb(out.data, storageKey).catch(() => undefined);
    return { storageKey, mime: "image/webp", size: out.data.length, width: out.info.width, height: out.info.height };
  }

  private async makeThumb(src: Buffer, storageKey: string) {
    const data = await sharp(src, { limitInputPixels: MAX_INPUT_PIXELS, pages: 1 })
      .rotate()
      .resize({ width: THUMB_MAX_SIDE, height: THUMB_MAX_SIDE, fit: "inside", withoutEnlargement: true })
      .webp({ quality: THUMB_QUALITY })
      .toBuffer();
    await fs.promises.writeFile(path.join(this.thumbDir, path.basename(storageKey) + ".webp"), data);
  }

  /** Thumbnail nếu có; ảnh cũ chưa có thumbnail → null (gọi nơi dùng sẽ trả ảnh gốc). */
  streamThumb(storageKey: string) {
    const file = path.join(this.thumbDir, path.basename(storageKey) + ".webp");
    if (!fs.existsSync(file)) return null;
    return { stream: fs.createReadStream(file), size: fs.statSync(file).size };
  }

  stream(storageKey: string) {
    const file = path.join(this.dir, path.basename(storageKey));
    if (!fs.existsSync(file)) throw new NotFoundException("Ảnh đã bị xoá");
    return fs.createReadStream(file);
  }

  async unlink(storageKey: string) {
    await fs.promises.unlink(path.join(this.dir, path.basename(storageKey))).catch(() => undefined);
    await fs.promises.unlink(path.join(this.thumbDir, path.basename(storageKey) + ".webp")).catch(() => undefined);
  }
}
