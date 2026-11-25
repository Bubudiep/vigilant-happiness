import { Module } from "@nestjs/common";
import { StorageStatsModule } from "../storage-stats/storage-stats.module";
import { StoresModule } from "../stores/stores.module";
import { MediaController } from "./media.controller";
import { MediaService } from "./media.service";

@Module({
  imports: [StoresModule, StorageStatsModule],
  controllers: [MediaController],
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule {}
