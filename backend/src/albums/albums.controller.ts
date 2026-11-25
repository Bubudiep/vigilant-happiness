import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, Req, Res, UploadedFiles, UseGuards, UseInterceptors } from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { memoryStorage } from "multer";
import { AppAuthGuard, RequireScopes, type AppRequest } from "../common/guards/app-auth.guard";
import { RateLimit, RateLimitGuard } from "../common/guards/rate-limit.guard";
import { ShopAuthGuard, type ShopRequest } from "../shop/shop-auth.guard";
import { StoresService } from "../stores/stores.service";
import { AlbumStorageService, MAX_ALBUM_PHOTO_BYTES } from "./album-storage.service";
import { type AlbumInput, AlbumsService } from "./albums.service";

const MAX_FILES_PER_UPLOAD = 30;

/** Chủ shop: album ảnh & tin nhắn với khách của store — /stores/:id/albums, /stores/:id/messages */
@ApiTags("albums")
@ApiBearerAuth()
@UseGuards(AppAuthGuard)
@RequireScopes("stores:write")
@Controller("stores/:id")
export class StoreAlbumsController {
  constructor(
    private readonly albums: AlbumsService,
    private readonly stores: StoresService,
  ) {}

  @Get("album-kinds")
  @ApiOperation({ summary: "Loại album của shop (mặc định: Hôm nay, Ảnh cưới, Đám hỏi, Khác)" })
  async kinds(@Req() req: AppRequest, @Param("id") id: string) {
    await this.stores.ensureSection(req.auth!, id, "albums");
    return this.albums.kinds(id);
  }

  @Put("album-kinds")
  @ApiOperation({ summary: "Lưu loại album: { kinds: [{ key?, label, color, icon, hint? }] } — album của loại bị xoá chuyển sang Khác" })
  async saveKinds(@Req() req: AppRequest, @Param("id") id: string, @Body("kinds") kinds: unknown) {
    await this.stores.ensureSection(req.auth!, id, "albums");
    return this.albums.saveKinds(id, kinds);
  }

  @Get("albums")
  @ApiOperation({ summary: "Danh sách album (lọc customerId, kind)" })
  async list(@Req() req: AppRequest, @Param("id") id: string, @Query("customerId") customerId?: string, @Query("kind") kind?: string) {
    await this.stores.ensureSection(req.auth!, id, "albums");
    return this.albums.list(id, { customerId, kind });
  }

  @Post("albums")
  @ApiOperation({ summary: "Tạo album cho khách (kind: key trong album-kinds, links: [{label,url}])" })
  async create(@Req() req: AppRequest, @Param("id") id: string, @Body() body: AlbumInput) {
    await this.stores.ensureSection(req.auth!, id, "albums");
    return this.albums.create(id, body ?? {});
  }

  @Get("albums/:albumId")
  async detail(@Req() req: AppRequest, @Param("id") id: string, @Param("albumId") albumId: string) {
    await this.stores.ensureSection(req.auth!, id, "albums");
    return this.albums.detail(id, albumId);
  }

  @Patch("albums/:albumId")
  async update(@Req() req: AppRequest, @Param("id") id: string, @Param("albumId") albumId: string, @Body() body: AlbumInput) {
    await this.stores.ensureSection(req.auth!, id, "albums");
    return this.albums.update(id, albumId, body ?? {});
  }

  @Delete("albums/:albumId")
  async remove(@Req() req: AppRequest, @Param("id") id: string, @Param("albumId") albumId: string) {
    await this.stores.ensureSection(req.auth!, id, "albums");
    return this.albums.remove(id, albumId);
  }

  @Post("albums/:albumId/photos")
  @ApiOperation({ summary: `Tải ảnh xem trước (field "files", tối đa ${MAX_FILES_PER_UPLOAD} ảnh / lần, 10MB / ảnh)` })
  @UseInterceptors(
    FilesInterceptor("files", MAX_FILES_PER_UPLOAD, { storage: memoryStorage(), limits: { fileSize: MAX_ALBUM_PHOTO_BYTES } }),
  )
  async upload(
    @Req() req: AppRequest,
    @Param("id") id: string,
    @Param("albumId") albumId: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    await this.stores.ensureSection(req.auth!, id, "albums");
    return this.albums.addPhotos(id, albumId, files);
  }

  @Delete("albums/:albumId/photos/:photoId")
  async removePhoto(@Req() req: AppRequest, @Param("id") id: string, @Param("albumId") albumId: string, @Param("photoId") photoId: string) {
    await this.stores.ensureSection(req.auth!, id, "albums");
    return this.albums.removePhoto(id, albumId, photoId);
  }

  @Post("albums/:albumId/publish")
  @ApiOperation({ summary: "Gửi album cho khách: đánh dấu đã gửi + nhắn tin vào hộp thư của khách" })
  async publish(@Req() req: AppRequest, @Param("id") id: string, @Param("albumId") albumId: string, @Body("message") message?: string) {
    await this.stores.ensureSection(req.auth!, id, "albums");
    return this.albums.publish(id, albumId, message);
  }

  @Post("albums/:albumId/unpublish")
  async unpublish(@Req() req: AppRequest, @Param("id") id: string, @Param("albumId") albumId: string) {
    await this.stores.ensureSection(req.auth!, id, "albums");
    return this.albums.unpublish(id, albumId);
  }

  @Get("messages/unread")
  async unread(@Req() req: AppRequest, @Param("id") id: string) {
    await this.stores.ensureSection(req.auth!, id, "albums");
    return this.albums.unreadByCustomer(id);
  }

  @Get("messages/conversations")
  @ApiOperation({ summary: "Danh sách hội thoại: tin cuối + số tin chưa đọc của từng khách" })
  async conversations(@Req() req: AppRequest, @Param("id") id: string) {
    await this.stores.ensureSection(req.auth!, id, "albums");
    return this.albums.conversations(id);
  }

  @Get("messages/:customerId")
  @ApiOperation({ summary: "Tin nhắn với một khách (đánh dấu đã đọc tin khách gửi)" })
  async thread(@Req() req: AppRequest, @Param("id") id: string, @Param("customerId") customerId: string) {
    await this.stores.ensureSection(req.auth!, id, "albums");
    return this.albums.thread(id, customerId, "in");
  }

  @Post("messages/:customerId")
  async send(@Req() req: AppRequest, @Param("id") id: string, @Param("customerId") customerId: string, @Body("body") body: string) {
    await this.stores.ensureSection(req.auth!, id, "albums");
    return this.albums.send(id, customerId, "out", body);
  }
}

/** Khách của store (Mini App): album & tin nhắn của chính mình — /shop/:slug/me/... */
@ApiTags("shop")
@ApiBearerAuth()
@UseGuards(ShopAuthGuard)
@Controller("shop/:slug/me")
export class ShopAlbumsController {
  constructor(private readonly albums: AlbumsService) {}

  @Get("albums")
  list(@Req() req: ShopRequest) {
    return this.albums.customerAlbums(req.shop!.storeId, req.shop!.customerId);
  }

  @Get("albums/:albumId")
  @ApiOperation({ summary: "Xem album (đánh dấu khách đã xem)" })
  detail(@Req() req: ShopRequest, @Param("albumId") albumId: string) {
    return this.albums.customerAlbum(req.shop!.storeId, req.shop!.customerId, albumId);
  }

  @Get("unread")
  @ApiOperation({ summary: "Số tin nhắn & album mới chưa xem (chấm đỏ)" })
  unread(@Req() req: ShopRequest) {
    return this.albums.customerUnread(req.shop!.storeId, req.shop!.customerId);
  }

  @Get("messages")
  messages(@Req() req: ShopRequest) {
    return this.albums.thread(req.shop!.storeId, req.shop!.customerId, "out");
  }

  @Post("messages")
  @UseGuards(RateLimitGuard)
  @RateLimit(40, 3600)
  send(@Req() req: ShopRequest, @Body("body") body: string) {
    return this.albums.send(req.shop!.storeId, req.shop!.customerId, "in", body);
  }
}

/** Ảnh album qua URL ký có hạn (thẻ <img> không gửi được header đăng nhập). */
@ApiTags("albums")
@Controller("album-photos")
export class AlbumPhotosController {
  constructor(
    private readonly albums: AlbumsService,
    private readonly storage: AlbumStorageService,
  ) {}

  @Get(":id")
  async download(@Param("id") id: string, @Query("exp") exp: string, @Query("sig") sig: string, @Query("t") t: string, @Res() res: Response) {
    if (!this.storage.verify(id, exp, sig)) return res.status(403).json({ message: "Liên kết không hợp lệ hoặc đã hết hạn" });
    const f = await this.albums.readPhoto(id, t === "1");
    res.set({
      "Content-Type": f.mime,
      "Content-Length": String(f.size),
      "Content-Disposition": `inline; filename="${encodeURIComponent(f.filename)}"`,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Cache-Control": "private, max-age=3600",
      "Cross-Origin-Resource-Policy": "cross-origin",
    });
    f.stream.pipe(res);
  }
}
