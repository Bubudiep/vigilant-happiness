import { Module } from "@nestjs/common";
import { BillingController } from "./billing.controller";
import { BillingService } from "./billing.service";
import { StoreDataController } from "./store-data.controller";
import { StoreDataService } from "./store-data.service";
import { StoresController } from "./stores.controller";
import { StoresService } from "./stores.service";
import { TingeeController, TingeeWebhookController } from "./tingee.controller";
import { TingeeService } from "./tingee.service";

@Module({
  controllers: [StoresController, StoreDataController, BillingController, TingeeController, TingeeWebhookController],
  providers: [StoresService, StoreDataService, BillingService, TingeeService],
  exports: [StoresService, StoreDataService],
})
export class StoresModule {}
