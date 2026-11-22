import { Global, Module } from "@nestjs/common";
import { AppAuthGuard } from "../common/guards/app-auth.guard";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./jwt-auth.guard";

@Global()
@Module({
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, AppAuthGuard],
  exports: [AuthService, JwtAuthGuard, AppAuthGuard],
})
export class AuthModule {}
