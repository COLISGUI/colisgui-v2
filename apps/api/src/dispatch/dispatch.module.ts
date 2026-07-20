import { Module } from '@nestjs/common';
import { DispatchService } from './dispatch.service';
import { DispatchController } from './dispatch.controller';
import { OrdersModule } from '../orders/orders.module';
@Module({ imports: [OrdersModule], controllers: [DispatchController], providers: [DispatchService] })
export class DispatchModule {}
