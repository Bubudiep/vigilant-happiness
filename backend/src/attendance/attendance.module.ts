import { Module } from "@nestjs/common";
import { StoresModule } from "../stores/stores.module";
import { AttendanceController } from "./attendance.controller";
import { AttendanceService } from "./attendance.service";

/** Chấm công. Máy chấm công (sau này) gọi AttendanceService.punch() theo attendanceCode của nhân viên. */
@Module({
  imports: [StoresModule],
  controllers: [AttendanceController],
  providers: [AttendanceService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
