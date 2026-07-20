import { Controller, Get, Param, Query } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller()
export class AnalyticsController {
  constructor(private analytics: AnalyticsService) {}

  @Get('dashboard/pipeline') pipeline() { return this.analytics.pipeline(); }

  @Get('dashboard/director') @Roles(UserRole.DIRECTEUR, UserRole.ADMIN)
  director(@Query('from') from?: string, @Query('to') to?: string) { return this.analytics.director(from, to); }

  @Get('analytics/top-partners') @Roles(UserRole.DIRECTEUR, UserRole.ADMIN)
  topPartners() { return this.analytics.topPartners(); }
  @Get('analytics/top-drivers') @Roles(UserRole.DIRECTEUR, UserRole.ADMIN)
  topDrivers() { return this.analytics.topDrivers(); }
  @Get('partners/:id/score') @Roles(UserRole.DIRECTEUR, UserRole.ADMIN, UserRole.COMMERCIAL)
  partnerScore(@Param('id') id: string) { return this.analytics.partnerScore(id); }
  @Get('drivers/:id/score') @Roles(UserRole.DIRECTEUR, UserRole.ADMIN, UserRole.DISPATCHER)
  driverScore(@Param('id') id: string) { return this.analytics.driverScore(id); }

  @Get('accounting/ledger') @Roles(UserRole.DIRECTEUR, UserRole.ADMIN, UserRole.COMPTABLE)
  ledger() { return this.analytics.ledger(); }

  // Recherche réservée aux rôles bureau (exclut LIVREUR pour éviter la fuite de données).
  @Get('search') @Roles(UserRole.DIRECTEUR, UserRole.ADMIN, UserRole.COMMERCIAL, UserRole.AGENT_CALL_CENTER, UserRole.DISPATCHER, UserRole.COMPTABLE)
  search(@Query('q') q: string) { return this.analytics.search(q ?? ''); }
}
