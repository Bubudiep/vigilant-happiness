import { Global, Module } from "@nestjs/common";
import { RateLimitGuard } from "../common/guards/rate-limit.guard";
import { OAuthApplicationsController, OAuthController } from "./oauth.controller";
import { OAuthService } from "./oauth.service";
import { ZaloService } from "./zalo.service";

@Global()
@Module({
  controllers: [OAuthController, OAuthApplicationsController],
  providers: [OAuthService, ZaloService, RateLimitGuard],
  exports: [OAuthService, ZaloService, RateLimitGuard],
})
export class OAuthModule {}
