import { Module } from "@nestjs/common";
import { StoreDataController } from "./store-data.controller";
import { StoreDataService } from "./store-data.service";
import { StoresController } from "./stores.controller";
import { StoresService } from "./stores.service";

@Module({
  controllers: [StoresController, StoreDataController],
  providers: [StoresService, StoreDataService],
  exports: [StoresService, StoreDataService],
})
export class StoresModule {}
