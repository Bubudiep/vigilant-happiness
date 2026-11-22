import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AlbumsModule } from "./albums/albums.module";
import { AntiSpamModule } from "./antispam/antispam.module";
import { AuditModule } from "./audit/audit.module";
import { AuthModule } from "./auth/auth.module";
import { CustomersModule } from "./customers/customers.module";
import { DebtsModule } from "./debts/debts.module";
import { BuildsModule } from "./builds/builds.module";
import { InboxModule } from "./inbox/inbox.module";
import { HealthModule } from "./health/health.module";
import { JobsModule } from "./jobs/jobs.module";
import { LeadsModule } from "./leads/leads.module";
import { MediaModule } from "./media/media.module";
import { NotifyModule } from "./notify/notify.module";
import { OAuthModule } from "./oauth/oauth.module";
import { PortalModule } from "./portal/portal.module";
import { PrismaModule } from "./prisma/prisma.module";
import { ShopModule } from "./shop/shop.module";
import { StoresModule } from "./stores/stores.module";
import { SubmissionsModule } from "./submissions/submissions.module";
import { SubscriptionsModule } from "./subscriptions/subscriptions.module";
import { TemplatesModule } from "./templates/templates.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    OAuthModule,
    AntiSpamModule,
    NotifyModule,
    AuditModule,
    JobsModule,
    HealthModule,
    LeadsModule,
    TemplatesModule,
    SubmissionsModule,
    StoresModule,
    ShopModule,
    AlbumsModule,
    MediaModule,
    CustomersModule,
    DebtsModule,
    InboxModule,
    BuildsModule,
    SubscriptionsModule,
    PortalModule,
  ],
})
export class AppModule {}
