import { Body, Controller, Get, Post } from '@nestjs/common';
import { DispatchService } from './dispatch.service';
import { DispatchAssignDto } from './dto/assign.dto';
import { DispatchReassignDto } from './dto/reassign.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@Controller('dispatch')
@Roles(UserRole.DIRECTEUR, UserRole.ADMIN, UserRole.DISPATCHER)
export class DispatchController {
  constructor(private dispatch: DispatchService) {}

  @Get('queue') queue() { return this.dispatch.queue(); }
  @Get('drivers-load') driversLoad() { return this.dispatch.driversLoad(); }
  @Post('assign') assign(@Body() dto: DispatchAssignDto, @CurrentUser('id') u: string) { return this.dispatch.assign(dto, u); }
  @Post('reassign') reassign(@Body() dto: DispatchReassignDto, @CurrentUser('id') u: string) { return this.dispatch.reassign(dto, u); }
}
