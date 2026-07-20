import { Body, Controller, Get, Put } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MaintenanceService } from './maintenance.service';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@Controller()
export class SystemController {
  constructor(private prisma: PrismaService, private maintenance: MaintenanceService) {}

  // #14 — Santé du système (public pour la supervision)
  @Public() @Get('health')
  async health() {
    let db = 'ok';
    try { await this.prisma.$queryRaw`SELECT 1`; } catch { db = 'down'; }
    const mem = process.memoryUsage();
    return {
      status: db === 'ok' ? 'healthy' : 'degraded',
      db,
      uptimeSeconds: Math.round(process.uptime()),
      memoryMb: Math.round(mem.rss / 1024 / 1024),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('system/status') @Roles(UserRole.DIRECTEUR, UserRole.ADMIN)
  async status() {
    const [users, commandes, notifsEnAttente] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.commande.count(),
      this.prisma.notification.count({ where: { statut: 'EN_ATTENTE' } }),
    ]);
    return { ...(await this.health()), ...(await this.maintenance.status()), stats: { users, commandes, notifsEnAttente } };
  }

  @Get('system/maintenance') maintenanceStatus() { return this.maintenance.status(); }

  @Put('system/maintenance') @Roles(UserRole.DIRECTEUR, UserRole.ADMIN)
  setMaintenance(@Body('on') on: boolean, @CurrentUser('id') u: string) { return this.maintenance.set(!!on, u); }
}
