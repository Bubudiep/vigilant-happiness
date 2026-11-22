import { Module } from "@nestjs/common";
import { OAuthModule } from "../oauth/oauth.module";
import { StoresModule } from "../stores/stores.module";
import { ShopAuthGuard } from "./shop-auth.guard";
import { ShopController } from "./shop.controller";
import { ShopService } from "./shop.service";

/** Tài khoản & dữ liệu của khách trong Mini App của từng gian hàng (/api/shop/:slug/...). */
@Module({
  imports: [OAuthModule, StoresModule],
  controllers: [ShopController],
  providers: [ShopService, ShopAuthGuard],
  exports: [ShopAuthGuard],
})
export class ShopModule {}
