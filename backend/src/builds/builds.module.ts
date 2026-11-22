import { Module } from "@nestjs/common";
import { StoresModule } from "../stores/stores.module";
import { AdminBuildsController, StoreBuildsController } from "./builds.controller";
import { BuildsService } from "./builds.service";

@Module({
  imports: [StoresModule],
  controllers: [StoreBuildsController, AdminBuildsController],
  providers: [BuildsService],
})
export class BuildsModule {}
