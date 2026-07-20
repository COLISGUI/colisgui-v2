import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { ZoneDto } from './dto/zone.dto';
import { MotifDto } from './dto/motif.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@Controller()
export class SettingsController {
  constructor(private settings: SettingsService) {}

  // Zones & motifs consultables par tous les utilisateurs authentifiés
  @Get('zones') zones() { return this.settings.zones(); }
  @Get('motifs') motifs() { return this.settings.motifs(); }

  @Get('settings') @Roles(UserRole.DIRECTEUR, UserRole.ADMIN) all() { return this.settings.all(); }
  @Get('settings/permissions') @Roles(UserRole.DIRECTEUR, UserRole.ADMIN) permissions() { return this.settings.permissions(); }
  @Put('settings/permissions') @Roles(UserRole.DIRECTEUR)
  setPermissions(@Query('role') role: string, @Body('permissionIds') ids: string[]) { return this.settings.setPermissions(role, ids); }
  @Get('settings/:cle') @Roles(UserRole.DIRECTEUR, UserRole.ADMIN) get(@Param('cle') cle: string) { return this.settings.get(cle); }
  @Put('settings/:cle') @Roles(UserRole.DIRECTEUR)
  set(@Param('cle') cle: string, @Body('valeur') valeur: any, @CurrentUser('id') u: string) { return this.settings.set(cle, valeur, u); }

  @Post('zones') @Roles(UserRole.DIRECTEUR, UserRole.ADMIN) createZone(@Body() dto: ZoneDto) { return this.settings.createZone(dto); }
  @Put('zones/:id') @Roles(UserRole.DIRECTEUR, UserRole.ADMIN) updateZone(@Param('id') id: string, @Body() dto: ZoneDto) { return this.settings.updateZone(id, dto); }

  @Post('motifs') @Roles(UserRole.DIRECTEUR, UserRole.ADMIN) createMotif(@Body() dto: MotifDto) { return this.settings.createMotif(dto); }
  @Put('motifs/:id') @Roles(UserRole.DIRECTEUR, UserRole.ADMIN) updateMotif(@Param('id') id: string, @Body() dto: MotifDto) { return this.settings.updateMotif(id, dto); }
}
