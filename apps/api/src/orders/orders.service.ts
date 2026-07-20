import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PricingService } from '../pricing/pricing.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RulesEngineService } from '../rules/rules-engine.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { ChangeStatusDto } from './dto/change-status.dto';
import { AssignOrderDto } from './dto/assign-order.dto';
import { PaginationDto, paginated } from '../common/dto/pagination.dto';

// Transitions de statut autorisées (voir cahier des charges §8.2)
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  CREEE: ['CONFIRMEE', 'ANNULEE', 'REFUSEE'],
  CONFIRMEE: ['ASSIGNEE', 'ANNULEE', 'REFUSEE'],
  ASSIGNEE: ['EN_COURS', 'REFUSEE', 'ANNULEE'],
  EN_COURS: ['LIVREE', 'REFUSEE', 'RETOUR'],
  LIVREE: [],
  REFUSEE: [],
  ANNULEE: [],
  RETOUR: [],
};

const MOTIF_REQUIS: OrderStatus[] = ['REFUSEE', 'ANNULEE', 'RETOUR'];

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private pricing: PricingService,
    private notifications: NotificationsService,
    private rules: RulesEngineService,
  ) {}

  private async genReference(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.commande.count();
    return `CMD-${year}-${String(count + 1).padStart(6, '0')}`;
  }

  // §8.1 — Détermination du mode de facturation à la création
  async create(dto: CreateOrderDto, createdById: string) {
    const partenaire = await this.prisma.partenaire.findUnique({
      where: { id: dto.partenaireId },
      include: { abonnements: { where: { statut: 'ACTIVE' }, take: 1 } },
    });
    if (!partenaire) throw new NotFoundException('Partenaire introuvable');

    const aboActif = partenaire.abonnements[0];
    let modeFacturation: 'ABONNEMENT' | 'GRILLE';
    let abonnementId: string | null = null;
    let grilleTarifId: string | null = null;
    let fraisLivraison = 0;

    if (aboActif && aboActif.livraisonsRestantes > 0) {
      // Partenaire abonné avec forfait disponible -> livraison couverte par le pack
      modeFacturation = 'ABONNEMENT';
      abonnementId = aboActif.id;
      fraisLivraison = 0;
    } else {
      // Non abonné, ou forfait épuisé/expiré -> tarification via la grille
      modeFacturation = 'GRILLE';
      if (!dto.pointDepart || !dto.destination) {
        throw new BadRequestException(
          'pointDepart et destination sont requis pour tarifer une commande hors abonnement',
        );
      }
      const quote = await this.pricing.quote(dto.pointDepart, dto.destination);
      grilleTarifId = quote.grilleTarifId;
      fraisLivraison = Number(quote.prix);
    }

    const data = {
      partenaireId: dto.partenaireId,
      clientNom: dto.clientNom,
      clientTelephone: dto.clientTelephone,
      clientAdresse: dto.clientAdresse,
      gpsLat: dto.gpsLat,
      gpsLng: dto.gpsLng,
      zoneId: dto.zoneId,
      prixProduit: dto.prixProduit,
      fraisLivraison,
      modeFacturation,
      abonnementId,
      grilleTarifId,
      observations: dto.observations,
      statut: 'CREEE' as const,
      createdById,
    };

    // Génération de référence robuste : réessai en cas de collision (concurrence).
    let commande;
    for (let attempt = 0; ; attempt++) {
      try {
        const reference = await this.genReference();
        commande = await this.prisma.commande.create({ data: { ...data, reference } });
        break;
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002' && attempt < 5) {
          continue; // référence déjà prise -> nouvelle tentative
        }
        throw e;
      }
    }

    await this.rules.emit(this.prisma, commande.id, 'CREATION', 'Commande créée', createdById, { reference: commande.reference });
    return commande;
  }

  async findAll(p: PaginationDto, statut?: OrderStatus, partenaireId?: string) {
    const where: Prisma.CommandeWhereInput = {};
    if (statut) where.statut = statut;
    if (partenaireId) where.partenaireId = partenaireId;
    const [data, total] = await Promise.all([
      this.prisma.commande.findMany({
        where,
        include: { partenaire: { select: { nom: true } }, livreur: { select: { nom: true, prenom: true } } },
        skip: (p.page - 1) * p.limit,
        take: p.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.commande.count({ where }),
    ]);
    return paginated(data, total, p.page, p.limit);
  }

  async findOne(id: string) {
    const commande = await this.prisma.commande.findUnique({
      where: { id },
      include: {
        partenaire: true,
        livreur: true,
        abonnement: { include: { pack: true } },
        grilleTarif: true,
        statutHistorique: { orderBy: { createdAt: 'desc' } },
        paiements: { include: { lignes: true } },
      },
    });
    if (!commande) throw new NotFoundException('Commande introuvable');
    return commande;
  }

  history(id: string) {
    return this.prisma.commandeStatutHistorique.findMany({
      where: { commandeId: id },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Confirmation (Call Center) : CREEE -> CONFIRMEE
  async confirm(id: string, userId: string) {
    return this.changeStatus(id, { statut: 'CONFIRMEE' }, userId, { confirmedById: userId });
  }

  // Affectation (Dispatch) : CONFIRMEE -> ASSIGNEE
  async assign(id: string, dto: AssignOrderDto, dispatcherId: string) {
    const commande = await this.prisma.commande.findUnique({ where: { id } });
    if (!commande) throw new NotFoundException('Commande introuvable');
    if (commande.statut !== 'CONFIRMEE') {
      throw new BadRequestException('Seules les commandes CONFIRMEE peuvent être affectées');
    }
    return this.prisma.$transaction(async (tx) => {
      await tx.affectation.create({
        data: { commandeId: id, livreurId: dto.livreurId, dispatcherId, priorite: dto.priorite ?? 0, statut: 'AFFECTEE' },
      });
      const updated = await tx.commande.update({
        where: { id },
        data: { statut: 'ASSIGNEE', livreurId: dto.livreurId },
      });
      await tx.commandeStatutHistorique.create({
        data: { commandeId: id, ancienStatut: 'CONFIRMEE', nouveauStatut: 'ASSIGNEE', userId: dispatcherId },
      });
      await tx.auditLog.create({
        data: { userId: dispatcherId, action: 'UPDATE', entite: 'commandes', entiteId: id, apres: { statut: 'ASSIGNEE', livreurId: dto.livreurId } },
      });
      await this.rules.onTransition(tx, { id }, 'ASSIGNEE', dispatcherId);
      return updated;
    });
  }

  // Transition générique + déclenchement de la règle pivot à la livraison
  async changeStatus(
    id: string,
    dto: ChangeStatusDto,
    userId: string,
    extra?: { confirmedById?: string },
  ) {
    const commande = await this.prisma.commande.findUnique({
      where: { id },
      include: { abonnement: true },
    });
    if (!commande) throw new NotFoundException('Commande introuvable');

    const cible = dto.statut;
    if (!TRANSITIONS[commande.statut].includes(cible)) {
      throw new BadRequestException(
        `Transition invalide : ${commande.statut} -> ${cible}`,
      );
    }
    if (MOTIF_REQUIS.includes(cible) && !dto.motifId) {
      throw new BadRequestException(`Un motif est obligatoire pour le statut ${cible}`);
    }

    // Transition simple (hors livraison)
    if (cible !== 'LIVREE') {
      return this.prisma.$transaction(async (tx) => {
        const updated = await tx.commande.update({
          where: { id },
          data: { statut: cible, ...(extra?.confirmedById ? { confirmedById: extra.confirmedById } : {}) },
        });
        await tx.commandeStatutHistorique.create({
          data: {
            commandeId: id,
            ancienStatut: commande.statut,
            nouveauStatut: cible,
            motifId: dto.motifId,
            commentaire: dto.commentaire,
            userId,
          },
        });
        await tx.auditLog.create({
          data: { userId, action: 'UPDATE', entite: 'commandes', entiteId: id, avant: { statut: commande.statut }, apres: { statut: cible }, raison: dto.commentaire ?? undefined },
        });
        await this.rules.onTransition(tx, { id }, cible, userId);
        return updated;
      });
    }

    // ===== RÈGLE PIVOT §8.3 — COMMANDE LIVRÉE (transaction atomique) =====
    return this.markDelivered(commande, dto, userId);
  }

  private async markDelivered(
    commande: Prisma.CommandeGetPayload<{ include: { abonnement: true } }>,
    dto: ChangeStatusDto,
    userId: string,
  ) {
    // Toute la logique automatique est centralisée dans le moteur de règles (#2).
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.commande.update({ where: { id: commande.id }, data: { statut: 'LIVREE' } });
      await tx.commandeStatutHistorique.create({
        data: { commandeId: commande.id, ancienStatut: commande.statut, nouveauStatut: 'LIVREE', commentaire: dto.commentaire, userId },
      });
      const money = await this.rules.applyDelivery(tx, commande, userId);
      return { message: 'Commande livrée et traitée', reference: commande.reference, ...money };
    });

    // Envoi des notifications créées (hors transaction) — sans bloquer la réponse.
    void this.notifications.dispatchPending().catch(() => undefined);
    return result;
  }

  // Timeline chronologique complète d'une commande (#1)
  timeline(id: string) {
    return this.prisma.commandeEvenement.findMany({ where: { commandeId: id }, orderBy: { createdAt: 'asc' } });
  }

  // Vue du circuit de l'argent pour une commande
  async orderFlow(id: string) {
    const transactions = await this.prisma.transaction.findMany({
      where: { commandeId: id },
      orderBy: { createdAt: 'asc' },
    });
    return { commandeId: id, transactions };
  }
}
