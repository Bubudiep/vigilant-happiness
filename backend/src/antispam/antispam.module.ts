import { Global, Module } from "@nestjs/common";
import { AntiSpamController } from "./antispam.controller";
import { AntiSpamService } from "./antispam.service";

@Global()
@Module({
  controllers: [AntiSpamController],
  providers: [AntiSpamService],
  exports: [AntiSpamService],
})
export class AntiSpamModule {}
