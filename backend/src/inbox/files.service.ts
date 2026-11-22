import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Attachment } from "@prisma/client";
import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import * as fs from "fs";
import * as path from "path";
import { PrismaService } from "../prisma/prisma.service";

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const EXT: Record<string, string> = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif" };

/** Nhận diện ảnh theo nội dung (không tin MIME/tên file do client gửi). */
export function sniffImageMime(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.subarray(0, 3).toString("ascii") === "GIF") return "image/gif";
  if (buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  return null;
}

/** Tên file hiển thị: bỏ đường dẫn / ký tự điều khiển, giới hạn độ dài. */
export function cleanFilename(name: string | undefined, fallback: string): string {
  const base = (name ?? "").split(/[\\/]/).pop() ?? "";
  // eslint-disable-next-line no-control-regex
  const safe = base.replace(/[\u0000-\u001f<>:"|?*]/g, "").trim().slice(0, 120);
  return safe || fallback;
}

/**
 * Lưu ảnh riêng tư của khách ngoài thư mục tĩnh (`uploads-private/`).
 * Truy cập qua URL ký HMAC có hạn: `/api/files/:id?exp=...&sig=...` — không đoán / liệt kê được.
 */
@Injectable()
export class FilesService {
  private readonly dir = path.join(process.cwd(), "uploads-private");

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    fs.mkdirSync(this.dir, { recursive: true });
  }

  private secret() {
    return this.config.get<string>("FILE_SIGN_SECRET") || this.config.get<string>("JWT_SECRET") || "dev-only-secret";
  }

  private mac(id: string, exp: number) {
    return createHmac("sha256", this.secret()).update(`${id}.${exp}`).digest("hex");
  }

  private origin() {
    const port = this.config.get<number>("PORT") ?? 4000;
    return (this.config.get<string>("PUBLIC_API_ORIGIN") || `http://localhost:${port}`).replace(/\/+$/, "");
  }

  /** URL tuyệt đối có chữ ký, mặc định sống 1 giờ. */
  signedUrl(id: string, ttlSec = 3600): string {
    const exp = Math.floor(Date.now() / 1000) + ttlSec;
    return `${this.origin()}/api/files/${id}?exp=${exp}&sig=${this.mac(id, exp)}`;
  }

  verify(id: string, exp: string | undefined, sig: string | undefined): boolean {
    const e = Number(exp);
    if (!sig || !Number.isFinite(e) || e < Date.now() / 1000) return false;
    const want = Buffer.from(this.mac(id, e));
    const got = Buffer.from(sig);
    return want.length === got.length && timingSafeEqual(want, got);
  }

  withUrl<T extends Attachment>(a: T, ttlSec?: number) {
    return { ...a, storageKey: undefined, url: this.signedUrl(a.id, ttlSec) };
  }

  async save(
    buf: Buffer,
    originalName: string | undefined,
    meta: { customerId?: string | null; conversationId?: string | null; source: "customer" | "staff"; tag?: string; note?: string },
  ): Promise<Attachment> {
    if (!buf?.length) throw new BadRequestException("Không nhận được file");
    if (buf.length > MAX_IMAGE_BYTES) throw new BadRequestException("Ảnh quá lớn (tối đa 8MB)");
    const mime = sniffImageMime(buf);
    if (!mime) throw new BadRequestException("Chỉ nhận ảnh JPG, PNG, WebP hoặc GIF");
    const storageKey = randomBytes(16).toString("hex") + EXT[mime];
    await fs.promises.writeFile(path.join(this.dir, storageKey), buf, { flag: "wx" });
    return this.prisma.attachment.create({
      data: {
        customerId: meta.customerId ?? null,
        conversationId: meta.conversationId ?? null,
        filename: cleanFilename(originalName, "anh" + EXT[mime]),
        mime,
        size: buf.length,
        storageKey,
        source: meta.source,
        tag: meta.tag?.trim().slice(0, 40) || null,
        note: meta.note?.trim().slice(0, 300) || null,
      },
    });
  }

  /** Tải ảnh từ URL ngoài (ảnh khách gửi qua OA — link Zalo hết hạn nên phải lưu về). */
  async saveFromUrl(url: string, meta: Parameters<FilesService["save"]>[2]): Promise<Attachment> {
    const u = new URL(url);
    if (u.protocol !== "https:") throw new BadRequestException("Chỉ tải ảnh qua https");
    const res = await fetch(u, { signal: AbortSignal.timeout(15000), redirect: "follow" });
    if (!res.ok) throw new BadRequestException(`Không tải được ảnh (${res.status})`);
    const declared = Number(res.headers.get("content-length") ?? 0);
    if (declared > MAX_IMAGE_BYTES) throw new BadRequestException("Ảnh quá lớn");
    const buf = Buffer.from(await res.arrayBuffer());
    return this.save(buf, u.pathname.split("/").pop(), meta);
  }

  async read(id: string): Promise<{ stream: fs.ReadStream; mime: string; filename: string; size: number }> {
    const a = await this.prisma.attachment.findUnique({ where: { id } });
    if (!a) throw new NotFoundException("Không tìm thấy file");
    const file = path.join(this.dir, path.basename(a.storageKey));
    if (!fs.existsSync(file)) throw new NotFoundException("File đã bị xoá");
    return { stream: fs.createReadStream(file), mime: a.mime, filename: a.filename, size: a.size };
  }

  async remove(id: string) {
    const a = await this.prisma.attachment.findUnique({ where: { id } });
    if (!a) throw new NotFoundException("Không tìm thấy file");
    await this.prisma.attachment.delete({ where: { id } });
    await fs.promises.unlink(path.join(this.dir, path.basename(a.storageKey))).catch(() => undefined);
    return { deleted: true };
  }
}
