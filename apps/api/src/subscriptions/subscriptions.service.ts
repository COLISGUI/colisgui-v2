import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';

@Injectable()
export class SubscriptionsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateSubscriptionDto, userId?: string) {
    const pack = await this.prisma.pack.findUnique({ where: { id: dto.packId } });
    if (!pack) throw new NotFoundException('Pack introuvable');

    const existing = await this.prisma.abonnement.findFirst({
      where: { partenaireId: dto.partenaireId, statut: 'ACTIVE' },
    });
    if (existing) throw new BadRequestException('Le partenaire a déjà un abonnement actif');

    const dateDebut = new Date();
    const dateFin = pack.dureeJours
      ? new Date(dateDebut.getTime() + pack.dureeJours * 24 * 3600 * 1000)
      : null;

    return this.prisma.$transaction(async (tx) => {
      const abo = await tx.abonnement.create({
        data: {
          partenaireId: dto.partenaireId,
          packId: pack.id,
          dateDebut,
          dateFin,
          livraisonsIncluses: pack.nombreLivraisons,
          livraisonsConsommees: 0,
          livraisonsRestantes: pack.nombreLivraisons,
          prixPaye: pack.prix,
          statut: 'ACTIVE',
          createdById: userId,
        },
      });
      await tx.partenaire.update({ where: { id: dto.partenaireId }, data: { type: 'ABONNE' } });
      await tx.abonnementHistorique.create({
        data: { abonnementId: abo.id, action: 'CREATION', nouveauStatut: 'ACTIVE', userId },
      });
      return abo;
    });
  }

  async renew(id: string, userId?: string) {
    const abo = await this.prisma.abonnement.findUnique({ where: { id }, include: { pack: true } });
    if (!abo) throw new NotFoundException('Abonnement introuvable');
    const dateFin = abo.pack.dureeJours
      ? new Date(Date.now() + abo.pack.dureeJours * 24 * 3600 * 1000)
      : null;
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.abonnement.update({
        where: { id },
        data: {
          livraisonsIncluses: abo.livraisonsIncluses + abo.pack.nombreLivraisons,
          livraisonsRestantes: abo.livraisonsRestantes + abo.pack.nombreLivraisons,
          statut: 'ACTIVE',
          dateFin,
        },
      });
      await tx.abonnementHistorique.create({
        data: { abonnementId: id, action: 'RENOUVELLEMENT', nouveauStatut: 'ACTIVE', userId },
      });
      return updated;
    });
  }

  async setStatut(id: string, statut: 'SUSPENDUE' | 'ACTIVE', userId?: string, raison?: string) {
    const action = statut === 'SUSPENDUE' ? 'SUSPENSION' : 'REACTIVATION';
    if (statut === 'SUSPENDUE' && !raison?.trim()) {
      throw new BadRequestException('Le motif de suspension de l\'abonnement est obligatoire.');
    }
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.abonnement.update({ where: { id }, data: { statut } });
      await tx.abonnementHistorique.create({ data: { abonnementId: id, action, nouveauStatut: statut, commentaire: raison, userId } });
      await tx.auditLog.create({
        data: { userId, action: statut === 'SUSPENDUE' ? 'SUSPENSION_ABONNEMENT' : 'REACTIVATION_ABONNEMENT',
          entite: 'abonnements', entiteId: id, apres: { statut }, raison },
      });
      return updated;
    });
  }

  findAll() { return this.prisma.abonnement.findMany({ include: { pack: true, partenaire: true }, orderBy: { createdAt: 'desc' } }); }
  findOne(id: string) { return this.prisma.abonnement.findUnique({ where: { id }, include: { pack: true, partenaire: true } }); }
  history(id: string) { return this.prisma.abonnementHistorique.findMany({ where: { abonnementId: id }, orderBy: { createdAt: 'desc' } }); }
}
