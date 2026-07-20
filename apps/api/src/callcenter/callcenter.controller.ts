import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { CallcenterService } from './callcenter.service';
import { CreateCallLogDto } from './dto/create-log.dto';
import { ScriptDto } from './dto/script.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@Controller()
export class CallcenterController {
  constructor(private cc: CallcenterService) {}

  @Get('call-center/queue') @Roles(UserRole.DIRECTEUR, UserRole.ADMIN, UserRole.AGENT_CALL_CENTER)
  queue() { return this.cc.queue(); }

  @Post('call-logs') @Roles(UserRole.DIRECTEUR, UserRole.ADMIN, UserRole.AGENT_CALL_CENTER)
  createLog(@Body() dto: CreateCallLogDto, @CurrentUser('id') u: string) { return this.cc.createLog(dto, u); }

  @Get('call-logs') logs(@Query('commande_id') commandeId: string) { return this.cc.logs(commandeId); }

  @Get('scripts') scripts() { return this.cc.scripts(); }
  @Post('scripts') @Roles(UserRole.DIRECTEUR, UserRole.ADMIN) createScript(@Body() dto: ScriptDto) { return this.cc.createScript(dto); }
  @Put('scripts/:id') @Roles(UserRole.DIRECTEUR, UserRole.ADMIN) updateScript(@Param('id') id: string, @Body() dto: ScriptDto) { return this.cc.updateScript(id, dto); }
}
