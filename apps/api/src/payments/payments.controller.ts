import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';

@Controller('payments')
export class PaymentsController {
  constructor(private payments: PaymentsService) {}

  @Post() create(@Body() dto: CreatePaymentDto, @CurrentUser('id') u: string) { return this.payments.create(dto, u); }
  @Get() findByOrder(@Query('commande_id') commandeId: string) { return this.payments.findByOrder(commandeId); }
  @Get(':id') findOne(@Param('id') id: string) { return this.payments.findOne(id); }
  @Patch(':id/status') setStatut(@Param('id') id: string, @Body('statut') statut: any) { return this.payments.setStatut(id, statut); }

  // Webhook Orange Money (public). Le secret partagé transite par notif_token (config OM).
  @Public() @Post('orange-money/callback')
  callback(@Body() body: any) { return this.payments.orangeMoneyCallback(body, body?.notif_token); }
}
