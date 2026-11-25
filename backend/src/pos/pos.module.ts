import { Module } from "@nestjs/common";
import { StoresModule } from "../stores/stores.module";
import { PosController } from "./pos.controller";
import { PosService } from "./pos.service";
import { ReportsService } from "./reports.service";

/** Bán hàng tại quầy (bàn / phòng / tính giờ) + báo cáo doanh thu */
@Module({
  imports: [StoresModule],
  controllers: [PosController],
  providers: [PosService, ReportsService],
})
export class PosModule {}
