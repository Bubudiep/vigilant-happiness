import { Module } from "@nestjs/common";
import { BillingController } from "./billing.controller";
import { BillingService } from "./billing.service";
import { StoreDataController } from "./store-data.controller";
import { StoreDataService } from "./store-data.service";
import { StoresController } from "./stores.controller";
import { StoresService } from "./stores.service";

@Module({
  controllers: [StoresController, StoreDataController, BillingController],
  providers: [StoresService, StoreDataService, BillingService],
  exports: [StoresService, StoreDataService],
})
export class StoresModule {}
