import { Module } from "@nestjs/common";
import { PortalAdminController, PortalController } from "./portal.controller";
import { PortalService } from "./portal.service";

@Module({
  controllers: [PortalController, PortalAdminController],
  providers: [PortalService],
  exports: [PortalService],
})
export class PortalModule {}
