import { Module } from "@nestjs/common";
import { StoresModule } from "../stores/stores.module";
import { StorageQuotaService } from "./storage-quota.service";
import { StorageStatsController } from "./storage-stats.controller";
import { StorageStatsService } from "./storage-stats.service";
import { StoreStorageController } from "./store-storage.controller";

@Module({
  imports: [StoresModule],
  controllers: [StorageStatsController, StoreStorageController],
  providers: [StorageStatsService, StorageQuotaService],
  exports: [StorageQuotaService, StorageStatsService],
})
export class StorageStatsModule {}
