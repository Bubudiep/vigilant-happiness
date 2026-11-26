import { Module } from "@nestjs/common";
import { StoresModule } from "../stores/stores.module";
import { PosController } from "./pos.controller";
import { PosService } from "./pos.service";
import { InventoryService } from "./inventory.service";
import { ReportsService } from "./reports.service";
import { TaxExportService } from "./tax-export.service";

/** Bán hàng tại quầy (bàn / phòng / tính giờ) + báo cáo doanh thu */
@Module({
  imports: [StoresModule],
  controllers: [PosController],
  providers: [PosService, ReportsService, InventoryService, TaxExportService],
})
export class PosModule {}
