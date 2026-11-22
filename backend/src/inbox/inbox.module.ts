import { Module } from "@nestjs/common";
import { PortalModule } from "../portal/portal.module";
import { StoresModule } from "../stores/stores.module";
import { FilesController, InboxAdminController, MeMessagesController, OaWebhookController, StoreInboxController } from "./inbox.controller";
import { InboxService } from "./inbox.service";
import { FilesService } from "./files.service";
import { OaService } from "./oa.service";
import { StoreOaService } from "./store-oa.service";

@Module({
  imports: [PortalModule, StoresModule],
  controllers: [InboxAdminController, FilesController, OaWebhookController, MeMessagesController, StoreInboxController],
  providers: [InboxService, FilesService, OaService, StoreOaService],
  exports: [InboxService, OaService, StoreOaService],
})
export class InboxModule {}
