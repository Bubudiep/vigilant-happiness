import { Module } from "@nestjs/common";
import { BillingController } from "./billing.controller";
import { BillingService } from "./billing.service";
import { StoreDataController } from "./store-data.controller";
import { StoreDataService } from "./store-data.service";
import { StoresController } from "./stores.controller";
import { StoresService } from "./stores.service";
import { TingeeController, TingeeWebhookController } from "./tingee.controller";
import { TingeeService } from "./tingee.service";
import { WalletService } from "./wallet.service";

@Module({
  controllers: [StoresController, StoreDataController, BillingController, TingeeController, TingeeWebhookController],
  providers: [StoresService, StoreDataService, BillingService, TingeeService, WalletService],
  exports: [StoresService, StoreDataService],
})
export class StoresModule {}
