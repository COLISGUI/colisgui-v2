import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private subs: SubscriptionsService) {}

  @Post() @Roles(UserRole.DIRECTEUR, UserRole.ADMIN, UserRole.COMMERCIAL)
  create(@Body() dto: CreateSubscriptionDto, @CurrentUser('id') id: string) { return this.subs.create(dto, id); }

  @Get() findAll() { return this.subs.findAll(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.subs.findOne(id); }
  @Get(':id/history') history(@Param('id') id: string) { return this.subs.history(id); }

  @Post(':id/renew') @Roles(UserRole.DIRECTEUR, UserRole.ADMIN, UserRole.COMMERCIAL)
  renew(@Param('id') id: string, @CurrentUser('id') u: string) { return this.subs.renew(id, u); }

  @Post(':id/suspend') @Roles(UserRole.DIRECTEUR, UserRole.ADMIN)
  suspend(@Param('id') id: string, @CurrentUser('id') u: string, @Body('raison') raison: string) { return this.subs.setStatut(id, 'SUSPENDUE', u, raison); }

  @Post(':id/reactivate') @Roles(UserRole.DIRECTEUR, UserRole.ADMIN)
  reactivate(@Param('id') id: string, @CurrentUser('id') u: string) { return this.subs.setStatut(id, 'ACTIVE', u); }
}
