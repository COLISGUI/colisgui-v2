import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { DispatchAssignDto } from './dto/assign.dto';
import { DispatchReassignDto } from './dto/reassign.dto';

@Injectable()
export class DispatchService {
  constructor(private prisma: PrismaService, private orders: OrdersService) {}

  // File des commandes confirmées à affecter
  queue() {
    return this.prisma.commande.findMany({
      where: { statut: 'CONFIRMEE' },
      include: { partenaire: { select: { nom: true } }, zone: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  assign(dto: DispatchAssignDto, dispatcherId: string) {
    return this.orders.assign(dto.commandeId, { livreurId: dto.livreurId, priorite: dto.priorite }, dispatcherId);
  }

  async reassign(dto: DispatchReassignDto, dispatcherId: string) {
    if (!dto.raison?.trim()) throw new BadRequestException('Le motif de réaffectation est obligatoire.');
    const commande = await this.prisma.commande.findUnique({ where: { id: dto.commandeId } });
    if (!commande) throw new NotFoundException('Commande introuvable');
    if (!['ASSIGNEE', 'EN_COURS'].includes(commande.statut)) {
      throw new BadRequestException('Seule une commande assignée ou en cours peut être réaffectée');
    }
    return this.prisma.$transaction(async (tx) => {
      await tx.affectation.updateMany({
        where: { commandeId: dto.commandeId, statut: 'AFFECTEE' },
        data: { statut: 'REAFFECTEE' },
      });
      await tx.affectation.create({
        data: { commandeId: dto.commandeId, livreurId: dto.nouveauLivreurId, dispatcherId, statut: 'AFFECTEE' },
      });
      const updated = await tx.commande.update({
        where: { id: dto.commandeId },
        data: { livreurId: dto.nouveauLivreurId },
      });
      await tx.auditLog.create({
        data: { userId: dispatcherId, action: 'REAFFECTATION', entite: 'commandes', entiteId: dto.commandeId, avant: { livreurId: commande.livreurId }, apres: { livreurId: dto.nouveauLivreurId }, raison: dto.raison },
      });
      return updated;
    });
  }

  // Charge courante par livreur (commandes ASSIGNEE + EN_COURS) — agrégation groupée (pas de N+1)
  async driversLoad() {
    const [livreurs, charges] = await Promise.all([
      this.prisma.livreur.findMany({ where: { statut: 'ACTIF' }, select: { id: true, nom: true, prenom: true } }),
      this.prisma.commande.groupBy({
        by: ['livreurId'],
        where: { livreurId: { not: null }, statut: { in: ['ASSIGNEE', 'EN_COURS'] } },
        _count: { _all: true },
      }),
    ]);
    const chargeById = new Map(charges.map((c) => [c.livreurId, c._count._all]));
    return livreurs
      .map((l) => ({ livreurId: l.id, nom: `${l.prenom} ${l.nom}`, charge: chargeById.get(l.id) ?? 0 }))
      .sort((a, b) => a.charge - b.charge);
  }
}
