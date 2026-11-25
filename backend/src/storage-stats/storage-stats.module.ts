import { Module } from "@nestjs/common";
import { StorageStatsController } from "./storage-stats.controller";
import { StorageStatsService } from "./storage-stats.service";

@Module({ controllers: [StorageStatsController], providers: [StorageStatsService] })
export class StorageStatsModule {}
