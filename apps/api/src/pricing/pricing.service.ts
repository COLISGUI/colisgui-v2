import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGrilleDto } from './dto/create-grille.dto';
import { UpdatePrixDto } from './dto/update-prix.dto';

@Injectable()
export class PricingService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateGrilleDto, userId?: string) {
    return this.prisma.grilleTarif.create({ data: { ...dto, createdById: userId } });
  }

  findAll() {
    return this.prisma.grilleTarif.findMany({ where: { actif: true }, orderBy: [{ pointDepart: 'asc' }, { destination: 'asc' }] });
  }

  history() {
    return this.prisma.grilleTarifHistorique.findMany({ orderBy: { createdAt: 'desc' }, take: 200 });
  }

  // Modification du prix — RÉSERVÉ AU DIRECTEUR — historique obligatoire
  async updatePrix(id: string, dto: UpdatePrixDto, userId: string) {
    const grille = await this.prisma.grilleTarif.findUnique({ where: { id } });
    if (!grille) throw new NotFoundException('Ligne de grille introuvable');
    return this.prisma.$transaction(async (tx) => {
      await tx.grilleTarifHistorique.create({
        data: {
          grilleId: grille.id,
          pointDepart: grille.pointDepart,
          destination: grille.destination,
          ancienPrix: grille.prix,
          nouveauPrix: dto.prix,
          motif: dto.motif,
          userId,
        },
      });
      const updated = await tx.grilleTarif.update({ where: { id }, data: { prix: dto.prix } });
      await tx.auditLog.create({
        data: { userId, action: 'MODIF_PRIX', entite: 'grille_tarifs', entiteId: id,
          avant: { prix: grille.prix }, apres: { prix: dto.prix }, raison: dto.motif },
      });
      return updated;
    });
  }

  deactivate(id: string) {
    return this.prisma.grilleTarif.update({ where: { id }, data: { actif: false } });
  }

  // Utilisé par le module Commandes pour tarifer une livraison hors abonnement
  async quote(pointDepart: string, destination: string) {
    const ligne = await this.prisma.grilleTarif.findFirst({
      where: { pointDepart, destination, actif: true },
    });
    if (!ligne) {
      throw new BadRequestException(`Aucun tarif défini pour ${pointDepart} → ${destination}`);
    }
    return { grilleTarifId: ligne.id, prix: ligne.prix };
  }
}
