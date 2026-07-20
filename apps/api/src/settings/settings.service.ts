import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ZoneDto } from './dto/zone.dto';
import { MotifDto } from './dto/motif.dto';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  // Paramètres clé/valeur
  all() { return this.prisma.parametre.findMany({ orderBy: { categorie: 'asc' } }); }
  async get(cle: string) {
    const p = await this.prisma.parametre.findUnique({ where: { cle } });
    if (!p) throw new NotFoundException('Paramètre introuvable');
    return p;
  }
  set(cle: string, valeur: any, userId?: string) {
    return this.prisma.parametre.upsert({
      where: { cle },
      update: { valeur, updatedById: userId },
      create: { cle, valeur, categorie: 'GENERAL', updatedById: userId },
    });
  }

  // Permissions par rôle
  permissions() { return this.prisma.rolePermission.findMany({ include: { permission: true } }); }
  async setPermissions(role: any, permissionIds: string[]) {
    await this.prisma.rolePermission.deleteMany({ where: { role } });
    await this.prisma.rolePermission.createMany({ data: permissionIds.map((permissionId) => ({ role, permissionId })) });
    return { message: 'Permissions mises à jour' };
  }

  // Zones
  zones() { return this.prisma.zone.findMany({ orderBy: { type: 'asc' } }); }
  createZone(dto: ZoneDto) { return this.prisma.zone.create({ data: dto }); }
  updateZone(id: string, dto: Partial<ZoneDto>) { return this.prisma.zone.update({ where: { id }, data: dto }); }

  // Motifs
  motifs() { return this.prisma.motif.findMany({ orderBy: { categorie: 'asc' } }); }
  createMotif(dto: MotifDto) { return this.prisma.motif.create({ data: dto }); }
  updateMotif(id: string, dto: Partial<MotifDto>) { return this.prisma.motif.update({ where: { id }, data: dto }); }
}
