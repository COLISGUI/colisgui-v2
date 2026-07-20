import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const CLE = 'maintenance_mode';

@Injectable()
export class MaintenanceService {
  private cache = { value: false, at: 0 };
  private ttl = 10_000; // 10s

  constructor(private prisma: PrismaService) {}

  async isOn(): Promise<boolean> {
    if (Date.now() - this.cache.at < this.ttl) return this.cache.value;
    const p = await this.prisma.parametre.findUnique({ where: { cle: CLE } });
    this.cache = { value: p?.valeur === true, at: Date.now() };
    return this.cache.value;
  }

  async set(on: boolean, userId?: string) {
    await this.prisma.parametre.upsert({
      where: { cle: CLE },
      update: { valeur: on, updatedById: userId },
      create: { cle: CLE, valeur: on, categorie: 'SYSTEME', description: "Mode maintenance : bloque l'accès aux non-admins", updatedById: userId },
    });
    this.cache = { value: on, at: Date.now() };
    return { maintenance: on };
  }

  async status() {
    return { maintenance: await this.isOn() };
  }
}
