import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { memoryStorage } from "multer";
import { AppAuthGuard, RequireScopes, type AppRequest } from "../common/guards/app-auth.guard";
import { StoresService } from "../stores/stores.service";
import { MediaService } from "./media.service";

@ApiTags("media")
@ApiBearerAuth()
@UseGuards(AppAuthGuard)
@RequireScopes("stores:write")
@Controller("stores")
export class MediaController {
  constructor(
    private readonly mediaService: MediaService,
    private readonly storesService: StoresService,
  ) {}

  @Post(":storeId/media/upload")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async upload(
    @Req() req: AppRequest,
    @Param("storeId") storeId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body("type") type?: string,
    @Body("alt") alt?: string,
  ) {
    await this.storesService.ensureAccess(req.auth!, storeId);
    return this.mediaService.saveUploadedFile(storeId, file, type, alt);
  }

  @Get(":storeId/media")
  async list(@Req() req: AppRequest, @Param("storeId") storeId: string, @Query("type") type?: string) {
    await this.storesService.ensureAccess(req.auth!, storeId);
    return this.mediaService.findByStore(storeId, type);
  }

  @Delete("media/:mediaId")
  async remove(@Req() req: AppRequest, @Param("mediaId") mediaId: string) {
    const storeId = await this.mediaService.findStoreIdOfMedia(mediaId);
    await this.storesService.ensureAccess(req.auth!, storeId);
    return this.mediaService.remove(mediaId);
  }
}
