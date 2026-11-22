import { Module } from "@nestjs/common";
import { OAuthModule } from "../oauth/oauth.module";
import { ShopModule } from "../shop/shop.module";
import { StoresModule } from "../stores/stores.module";
import { AlbumStorageService } from "./album-storage.service";
import { AlbumPhotosController, ShopAlbumsController, StoreAlbumsController } from "./albums.controller";
import { AlbumsService } from "./albums.service";

/** Album ảnh của khách theo từng gian hàng + hộp thư store ↔ khách. */
@Module({
  imports: [StoresModule, ShopModule, OAuthModule],
  controllers: [StoreAlbumsController, ShopAlbumsController, AlbumPhotosController],
  providers: [AlbumsService, AlbumStorageService],
})
export class AlbumsModule {}
