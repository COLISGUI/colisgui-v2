import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { OrangeMoneyProvider } from './providers/orange-money.provider';
import { RulesEngineService } from '../rules/rules-engine.service';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService, private om: OrangeMoneyProvider, private rules: RulesEngineService) {}

  async create(dto: CreatePaymentDto, collecteParId: string) {
    const commande = await this.prisma.commande.findUnique({ where: { id: dto.commandeId } });

    // Espèces : encaissement immédiat, statut PAYE.
    if (dto.mode === 'ESPECES') {
      const paiement = await this.prisma.paiement.create({
        data: { commandeId: dto.commandeId, mode: 'ESPECES', montant: dto.montant, statut: 'PAYE', collecteParId },
      });
      await this.rules.emit(this.prisma, dto.commandeId, 'PAIEMENT', `Paiement espèces enregistré : ${dto.montant} GNF`, collecteParId, { mode: 'ESPECES', montant: dto.montant });
      return paiement;
    }

    // Orange Money : initiation, statut EN_ATTENTE jusqu'au callback de confirmation.
    const init = await this.om.initiate(dto.montant, commande?.reference ?? dto.commandeId);
    const paiement = await this.prisma.paiement.create({
      data: {
        commandeId: dto.commandeId,
        mode: 'ORANGE_MONEY',
        montant: dto.montant,
        statut: init.status === 'SIMULATED' ? 'PAYE' : 'EN_ATTENTE',
        referenceExterne: init.externalRef,
        collecteParId,
      },
    });
    await this.rules.emit(this.prisma, dto.commandeId, 'PAIEMENT', `Paiement Orange Money ${init.status === 'SIMULATED' ? '(simulé) ' : ''}: ${dto.montant} GNF`, collecteParId, { mode: 'ORANGE_MONEY', montant: dto.montant, ref: init.externalRef });
    return { ...paiement, paymentUrl: init.paymentUrl ?? null, simulation: init.status === 'SIMULATED' };
  }

  // Callback Orange Money (webhook notif_url). Durci : secret partagé, idempotence, matching souple.
  async orangeMoneyCallback(body: any, providedToken?: string) {
    // 1. Vérification du secret partagé (si configuré). En production, OM_NOTIF_TOKEN DOIT être défini.
    const secret = process.env.OM_NOTIF_TOKEN;
    if (secret && providedToken !== secret) {
      return { ok: false, message: 'Signature du callback invalide' };
    }
    if (!secret && process.env.NODE_ENV === 'production') {
      return { ok: false, message: 'OM_NOTIF_TOKEN non configuré côté serveur' };
    }

    const ref = body?.pay_token ?? body?.payToken ?? body?.order_id ?? body?.txnid;
    const status = body?.status;
    if (!ref) return { ok: false, message: 'Référence de paiement manquante' };

    const paiement = await this.prisma.paiement.findFirst({ where: { referenceExterne: ref } });
    if (!paiement) return { ok: false, message: 'Paiement introuvable' };

    // 2. Idempotence : un paiement déjà confirmé n'est pas retraité (OM peut renvoyer plusieurs fois).
    if (paiement.statut === 'PAYE') return { ok: true, statut: 'PAYE', message: 'Déjà traité' };

    const nouveau = status === 'SUCCESS' ? 'PAYE' : 'EN_ATTENTE';
    await this.prisma.paiement.update({ where: { id: paiement.id }, data: { statut: nouveau } });

    // 3. Trace timeline si confirmé.
    if (nouveau === 'PAYE') {
      await this.rules.emit(this.prisma, paiement.commandeId, 'PAIEMENT', `Paiement Orange Money confirmé : ${paiement.montant} GNF`, undefined, { ref });
    }
    return { ok: true, statut: nouveau };
  }

  findByOrder(commandeId: string) {
    return this.prisma.paiement.findMany({ where: { commandeId }, orderBy: { createdAt: 'desc' } });
  }
  findOne(id: string) { return this.prisma.paiement.findUnique({ where: { id } }); }
  setStatut(id: string, statut: 'EN_ATTENTE' | 'PARTIEL' | 'PAYE') {
    return this.prisma.paiement.update({ where: { id }, data: { statut } });
  }
}
