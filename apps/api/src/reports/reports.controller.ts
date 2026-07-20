import { Controller, Get, Param, Query } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('reports')
@Roles(UserRole.DIRECTEUR, UserRole.ADMIN, UserRole.COMPTABLE)
export class ReportsController {
  constructor(private reports: ReportsService) {}

  @Get('daily') @Roles(UserRole.DIRECTEUR, UserRole.ADMIN, UserRole.COMPTABLE)
  daily(@Query('date') date?: string) { return this.reports.daily(date); }
  @Get('weekly') @Roles(UserRole.DIRECTEUR, UserRole.ADMIN, UserRole.COMPTABLE)
  weekly(@Query('date') date?: string) {
    const d = date ? new Date(date) : new Date();
    const from = new Date(d); from.setDate(d.getDate() - d.getDay());
    const to = new Date(from.getTime() + 7 * 24 * 3600 * 1000);
    return this.reports.period(from, to);
  }
  @Get('monthly') @Roles(UserRole.DIRECTEUR, UserRole.ADMIN, UserRole.COMPTABLE)
  monthly(@Query('month') month?: string) { return this.reports.monthly(month); }
  @Get('annual') @Roles(UserRole.DIRECTEUR, UserRole.ADMIN, UserRole.COMPTABLE)
  annual(@Query('year') year?: string) { return this.reports.annual(year); }
  @Get('financial') @Roles(UserRole.DIRECTEUR, UserRole.ADMIN, UserRole.COMPTABLE)
  financial(@Query('from') from: string, @Query('to') to: string) {
    return this.reports.period(new Date(from), new Date(to));
  }
  @Get('driver/:id') @Roles(UserRole.DIRECTEUR, UserRole.ADMIN, UserRole.DISPATCHER)
  driver(@Param('id') id: string) { return this.reports.driver(id); }
  @Get('commercial/:id') @Roles(UserRole.DIRECTEUR, UserRole.ADMIN, UserRole.COMMERCIAL)
  commercial(@Param('id') id: string) { return this.reports.commercial(id); }
  @Get('partner/:id') @Roles(UserRole.DIRECTEUR, UserRole.ADMIN, UserRole.COMMERCIAL, UserRole.COMPTABLE)
  partner(@Param('id') id: string) { return this.reports.partner(id); }
}
