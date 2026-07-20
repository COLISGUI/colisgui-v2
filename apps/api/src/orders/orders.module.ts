import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { PricingModule } from '../pricing/pricing.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RulesModule } from '../rules/rules.module';

@Module({
  imports: [PricingModule, NotificationsModule, RulesModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
