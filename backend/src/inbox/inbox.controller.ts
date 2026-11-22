import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Query,
  RawBodyRequest,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Request, Response } from "express";
import { memoryStorage } from "multer";
import { AuditService } from "../audit/audit.service";
import { AdminOnly, AppAuthGuard, RequireScopes, type AppRequest } from "../common/guards/app-auth.guard";
import { RateLimit, RateLimitGuard } from "../common/guards/rate-limit.guard";
import { FilesService, MAX_IMAGE_BYTES } from "./files.service";
import { CreateCareDto, OaCredentialsDto, UpdateAttachmentDto, UpdateCareDto, UpdateConversationDto } from "./inbox.dto";
import { InboxService } from "./inbox.service";
import { OaService, oaSignature, verifyOaSignature } from "./oa.service";

const upload = () => FileInterceptor("file", { storage: memoryStorage(), limits: { fileSize: MAX_IMAGE_BYTES, files: 1 } });
const staffName = (req: AppRequest) => req.auth?.email ?? "Nhân viên";

/** Hộp thư, ảnh khách, việc chăm sóc, kết nối OA — chỉ quản trị viên. */
@ApiTags("inbox")
@ApiBearerAuth()
@UseGuards(AppAuthGuard)
@AdminOnly()
@Controller("inbox")
export class InboxAdminController {
  constructor(
    private readonly inbox: InboxService,
    private readonly files: FilesService,
    private readonly oa: OaService,
    private readonly audit: AuditService,
  ) {}

  @Get("summary")
  summary() {
    return this.inbox.summary();
  }

  @Get("conversations")
  list(@Query("status") status?: string, @Query("channel") channel?: string, @Query("q") q?: string, @Query("customerId") customerId?: string) {
    return this.inbox.list({ status, channel, q, customerId });
  }

  @Get("conversations/:id")
  get(@Param("id") id: string) {
    return this.inbox.get(id);
  }

  @Post("conversations/:id/messages")
  @UseInterceptors(upload())
  send(@Req() req: AppRequest, @Param("id") id: string, @Body("body") body?: string, @Body("internal") internal?: string, @UploadedFile() file?: Express.Multer.File) {
    return this.inbox.staffSend(id, staffName(req), { body, internal: internal === "true", file });
  }

  @Patch("conversations/:id")
  async update(@Req() req: AppRequest, @Param("id") id: string, @Body() dto: UpdateConversationDto) {
    const r = await this.inbox.update(id, dto);
    void this.audit.record(req, "inbox.conversation.update", { type: "conversation", id }, { fields: Object.keys(dto) });
    return r;
  }

  // ── Ảnh khách ──
  @Get("files")
  gallery(@Query("customerId") customerId?: string, @Query("conversationId") conversationId?: string, @Query("tag") tag?: string, @Query("source") source?: string, @Query("q") q?: string) {
    return this.inbox.gallery({ customerId, conversationId, tag, source, q });
  }

  @Post("customers/:customerId/files")
  @UseInterceptors(upload())
  uploadForCustomer(@Param("customerId") customerId: string, @UploadedFile() file: Express.Multer.File, @Body("tag") tag?: string, @Body("note") note?: string) {
    return this.inbox.uploadForCustomer(customerId, file, tag, note);
  }

  @Patch("files/:id")
  updateFile(@Param("id") id: string, @Body() dto: UpdateAttachmentDto) {
    return this.inbox.updateAttachment(id, dto);
  }

  @Delete("files/:id")
  async removeFile(@Req() req: AppRequest, @Param("id") id: string) {
    const r = await this.files.remove(id);
    void this.audit.record(req, "inbox.file.delete", { type: "attachment", id });
    return r;
  }

  // ── Việc chăm sóc ──
  @Get("care")
  careList(@Query("status") status?: string, @Query("customerId") customerId?: string) {
    return this.inbox.careList({ status, customerId });
  }

  @Post("care")
  careCreate(@Req() req: AppRequest, @Body() dto: CreateCareDto) {
    return this.inbox.careCreate(dto, staffName(req));
  }

  @Patch("care/:id")
  careUpdate(@Param("id") id: string, @Body() dto: UpdateCareDto) {
    return this.inbox.careUpdate(id, dto);
  }

  @Delete("care/:id")
  careDelete(@Param("id") id: string) {
    return this.inbox.careDelete(id);
  }

  // ── Zalo OA ──
  @Get("oa/status")
  oaStatus() {
    return this.oa.status();
  }

  @Put("oa/credentials")
  @ApiOperation({ summary: "Dán access token + refresh token OA (lấy từ trang Zalo for Developers)" })
  async oaCredentials(@Req() req: AppRequest, @Body() dto: OaCredentialsDto) {
    await this.oa.setCredentials(dto.accessToken.trim(), dto.refreshToken.trim());
    void this.audit.record(req, "inbox.oa.credentials", { type: "oa" });
    return this.oa.status();
  }
}

/** Tải ảnh qua URL ký có hạn (thẻ <img> không gửi được header đăng nhập). */
@ApiTags("files")
@Controller("files")
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @Get(":id")
  async download(@Param("id") id: string, @Query("exp") exp: string, @Query("sig") sig: string, @Res() res: Response) {
    if (!this.files.verify(id, exp, sig)) return res.status(403).json({ message: "Liên kết không hợp lệ hoặc đã hết hạn" });
    const f = await this.files.read(id);
    res.set({
      "Content-Type": f.mime,
      "Content-Length": String(f.size),
      "Content-Disposition": `inline; filename="${encodeURIComponent(f.filename)}"`,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Cache-Control": "private, max-age=300",
      "Cross-Origin-Resource-Policy": "cross-origin",
    });
    f.stream.pipe(res);
  }
}

/** Webhook Zalo OA — xác thực bằng chữ ký, không dùng đăng nhập. */
@ApiTags("oa")
@Controller("oa")
export class OaWebhookController {
  constructor(
    private readonly inbox: InboxService,
    private readonly oa: OaService,
  ) {}

  @Get("webhook")
  ping() {
    return { ok: true };
  }

  @Post("webhook")
  @HttpCode(200)
  webhook(@Req() req: RawBodyRequest<Request>, @Body() body: Record<string, unknown>, @Res({ passthrough: true }) res: Response) {
    const appId = this.oa.appId();
    const secret = this.oa.oaSecret();
    const raw = req.rawBody?.toString("utf8");
    if (!secret || !appId || !raw) {
      res.status(503);
      return { ok: false, message: "Chưa cấu hình ZALO_OA_SECRET" };
    }
    const mac = oaSignature(appId, raw, String(body?.timestamp ?? ""), secret);
    if (!verifyOaSignature(req.headers["x-zevent-signature"] as string | undefined, mac) || (body?.app_id && String(body.app_id) !== appId)) {
      res.status(401);
      return { ok: false };
    }
    // trả lời ngay, xử lý nền (tải ảnh có thể chậm; Zalo gửi lại nếu quá lâu)
    void this.inbox.handleOaEvent(body);
    return { ok: true };
  }
}

/** Khách nhắn tin với reMini trong Mini App (đăng nhập Zalo). */
@ApiTags("portal")
@ApiBearerAuth()
@UseGuards(AppAuthGuard)
@RequireScopes("profile")
@Controller("me/messages")
export class MeMessagesController {
  constructor(private readonly inbox: InboxService) {}

  @Get()
  thread(@Req() req: AppRequest, @Query("after") after?: string) {
    return this.inbox.customerThread(req.auth!, after);
  }

  @Get("unread")
  unread(@Req() req: AppRequest) {
    return this.inbox.customerUnread(req.auth!);
  }

  @Post()
  @RequireScopes("tickets:write")
  @UseGuards(RateLimitGuard)
  @RateLimit(40, 3600)
  @UseInterceptors(upload())
  send(@Req() req: AppRequest, @Body("body") body?: string, @UploadedFile() file?: Express.Multer.File) {
    return this.inbox.customerSend(req.auth!, { body, file });
  }
}
