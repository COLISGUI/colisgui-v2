import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('notifications')
export class NotificationsController {
  constructor(private notifications: NotificationsService) {}

  @Get() @Roles(UserRole.DIRECTEUR, UserRole.ADMIN)
  list(@Query('destinataire_id') id?: string) { return this.notifications.list(id); }

  @Post('dispatch') @Roles(UserRole.DIRECTEUR, UserRole.ADMIN)
  dispatch() { return this.notifications.dispatchPending(); }

  @Post('send') @Roles(UserRole.DIRECTEUR, UserRole.ADMIN)
  send(@Body() body: any) { return this.notifications.sendNow(body); }

  @Patch(':id/read') markRead(@Param('id') id: string) { return this.notifications.markRead(id); }
}
