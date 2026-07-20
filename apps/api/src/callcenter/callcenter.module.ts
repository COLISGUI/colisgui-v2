import { Module } from '@nestjs/common';
import { CallcenterService } from './callcenter.service';
import { CallcenterController } from './callcenter.controller';
import { OrdersModule } from '../orders/orders.module';
@Module({ imports: [OrdersModule], controllers: [CallcenterController], providers: [CallcenterService] })
export class CallcenterModule {}
