import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { CreateCallLogDto } from './dto/create-log.dto';
import { ScriptDto } from './dto/script.dto';

@Injectable()
export class CallcenterService {
  constructor(private prisma: PrismaService, private orders: OrdersService) {}

  // Enregistre une tentative d'appel ; si CONFIRMEE -> confirme la commande
  async createLog(dto: CreateCallLogDto, agentId: string) {
    const log = await this.prisma.callCenterLog.create({
      data: {
        commandeId: dto.commandeId,
        agentId,
        resultat: dto.resultat,
        motifId: dto.motifId,
        scriptId: dto.scriptId,
        commentaire: dto.commentaire,
      },
    });
    if (dto.resultat === 'CONFIRMEE') {
      await this.orders.confirm(dto.commandeId, agentId);
    } else if (dto.resultat === 'REFUSEE') {
      await this.orders.changeStatus(dto.commandeId, { statut: 'REFUSEE', motifId: dto.motifId, commentaire: dto.commentaire }, agentId);
    }
    return log;
  }

  logs(commandeId: string) {
    return this.prisma.callCenterLog.findMany({ where: { commandeId }, orderBy: { createdAt: 'desc' } });
  }

  // File d'attente : commandes à confirmer
  queue() {
    return this.prisma.commande.findMany({
      where: { statut: 'CREEE' },
      include: { partenaire: { select: { nom: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  scripts() { return this.prisma.script.findMany({ where: { actif: true } }); }
  createScript(dto: ScriptDto) { return this.prisma.script.create({ data: dto }); }
  updateScript(id: string, dto: Partial<ScriptDto>) { return this.prisma.script.update({ where: { id }, data: dto }); }
}
