import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { OrangeMoneyProvider } from './providers/orange-money.provider';
import { RulesModule } from '../rules/rules.module';

@Module({ imports: [RulesModule], controllers: [PaymentsController], providers: [PaymentsService, OrangeMoneyProvider] })
export class PaymentsModule {}
