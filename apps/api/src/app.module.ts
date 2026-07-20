import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PartnersModule } from './partners/partners.module';
import { PacksModule } from './packs/packs.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { PricingModule } from './pricing/pricing.module';
import { OrdersModule } from './orders/orders.module';
import { CallcenterModule } from './callcenter/callcenter.module';
import { DispatchModule } from './dispatch/dispatch.module';
import { DriversModule } from './drivers/drivers.module';
import { PaymentsModule } from './payments/payments.module';
import { AccountingModule } from './accounting/accounting.module';
import { ReportsModule } from './reports/reports.module';
import { AuditModule } from './audit/audit.module';
import { SettingsModule } from './settings/settings.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { SystemModule } from './system/system.module';
import { MaintenanceGuard } from './system/maintenance.guard';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 120 }]),
    PrismaModule,
    AuthModule,
    UsersModule,
    PartnersModule,
    PacksModule,
    SubscriptionsModule,
    PricingModule,
    OrdersModule,
    CallcenterModule,
    DispatchModule,
    DriversModule,
    PaymentsModule,
    AccountingModule,
    ReportsModule,
    AuditModule,
    SettingsModule,
    NotificationsModule,
    AnalyticsModule,
    SystemModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: MaintenanceGuard },
  ],
})
export class AppModule {}
