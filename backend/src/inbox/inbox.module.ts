import { Module } from "@nestjs/common";
import { PortalModule } from "../portal/portal.module";
import { FilesController, InboxAdminController, MeMessagesController, OaWebhookController } from "./inbox.controller";
import { InboxService } from "./inbox.service";
import { FilesService } from "./files.service";
import { OaService } from "./oa.service";

@Module({
  imports: [PortalModule],
  controllers: [InboxAdminController, FilesController, OaWebhookController, MeMessagesController],
  providers: [InboxService, FilesService, OaService],
  exports: [InboxService, OaService],
})
export class InboxModule {}
