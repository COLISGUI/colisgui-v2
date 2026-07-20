import { Injectable } from '@nestjs/common';
import { EvenementType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type Db = PrismaService | Prisma.TransactionClient;

// Compte caisse principal (créé par le seed).
const CAISSE_ID = '00000000-0000-0000-0000-000000000001';

/**
 * Moteur d'automatisation des règles métier (#2).
 * Centralise toutes les actions automatiques déclenchées par le cycle de vie
 * d'une commande, et journalise chaque étape dans la timeline (#1).
 * Les méthodes acceptent un client transactionnel (`tx`) pour rester atomiques.
 */
@Injectable()
export class RulesEngineService {
  constructor(private prisma: PrismaService) {}

  /** Émet un évènement de timeline pour une commande. */
  emit(db: Db, commandeId: string, type: EvenementType, libelle: string, userId?: string, meta?: any) {
    return (db as any).commandeEvenement.create({
      data: { commandeId, type, libelle, userId, meta: meta ?? undefined },
    });
  }

  /** Évènement lié à une transition simple (confirmation, prise en charge, refus…). */
  async onTransition(db: Db, commande: { id: string }, statut: string, userId: string) {
    const map: Record<string, { type: EvenementType; libelle: string }> = {
      CONFIRMEE: { type: 'CONFIRMATION', libelle: 'Confirmée par le Call Center' },
      ASSIGNEE: { type: 'AFFECTATION', libelle: 'Affectée par le Dispatch' },
      EN_COURS: { type: 'PRISE_EN_CHARGE', libelle: 'Prise en charge par le livreur' },
      REFUSEE: { type: 'REFUS', libelle: 'Commande refusée' },
      ANNULEE: { type: 'ANNULATION', libelle: 'Commande annulée' },
      RETOUR: { type: 'RETOUR', libelle: 'Retour enregistré' },
    };
    const e = map[statut];
    if (e) await this.emit(db, commande.id, e.type, e.libelle, userId);
  }

  /**
   * Applique TOUTES les règles automatiques d'une livraison (#2), dans l'ordre :
   * décrément abonnement → commission → reversement → écriture comptable →
   * audit → notifications, en journalisant chaque étape dans la timeline.
   */
  async applyDelivery(
    tx: Prisma.TransactionClient,
    commande: {
      id: string; reference: string; partenaireId: string; modeFacturation: string;
      abonnementId: string | null; prixProduit: any; fraisLivraison: any; statut: string;
    },
    userId: string,
  ) {
    const prixProduit = Number(commande.prixProduit);
    const frais = Number(commande.fraisLivraison);
    const argentCollecte = prixProduit + frais;
    const commission = frais;              // commission ColisGui = frais de livraison
    const reversement = prixProduit;       // dû au partenaire = prix produit

    await this.emit(tx, commande.id, 'LIVRAISON', 'Livraison effectuée', userId, { argentCollecte });

    // 1. Décrément de l'abonnement
    if (commande.modeFacturation === 'ABONNEMENT' && commande.abonnementId) {
      const abo = await tx.abonnement.update({
        where: { id: commande.abonnementId },
        data: { livraisonsConsommees: { increment: 1 }, livraisonsRestantes: { decrement: 1 } },
      });
      await this.emit(tx, commande.id, 'DECREMENT_ABONNEMENT', `Forfait décrémenté (${abo.livraisonsRestantes} restantes)`, userId);
      if (abo.livraisonsRestantes <= 0) {
        await tx.abonnement.update({ where: { id: abo.id }, data: { statut: 'EPUISEE' } });
        await tx.notification.create({ data: { destinataireType: 'PARTENAIRE', destinataireId: commande.partenaireId, canal: 'WHATSAPP', titre: 'Forfait épuisé', contenu: 'Votre forfait de livraisons est épuisé. Pensez à le renouveler.' } });
        await this.emit(tx, commande.id, 'NOTIFICATION', 'Alerte « forfait épuisé » programmée', userId);
      } else {
        const seuil = await tx.parametre.findUnique({ where: { cle: 'alerte_forfait_seuil' } });
        const seuilVal = seuil ? Number(seuil.valeur) : 3;
        if (abo.livraisonsRestantes <= seuilVal) {
          await tx.notification.create({ data: { destinataireType: 'PARTENAIRE', destinataireId: commande.partenaireId, canal: 'WHATSAPP', titre: 'Forfait bientôt épuisé', contenu: `Il vous reste ${abo.livraisonsRestantes} livraison(s).` } });
          await this.emit(tx, commande.id, 'NOTIFICATION', `Alerte « forfait bas » programmée (${abo.livraisonsRestantes})`, userId);
        }
      }
    }

    // 2. Circuit de l'argent
    await tx.transaction.createMany({
      data: [
        { type: 'COLLECTE', sens: 'ENTREE', montant: argentCollecte, commandeId: commande.id, partenaireId: commande.partenaireId, compteId: CAISSE_ID, createdById: userId, description: 'Encaissement livraison' },
        { type: 'COMMISSION', sens: 'ENTREE', montant: commission, commandeId: commande.id, partenaireId: commande.partenaireId, createdById: userId, description: 'Commission ColisGui' },
        { type: 'REVERSEMENT', sens: 'SORTIE', montant: reversement, commandeId: commande.id, partenaireId: commande.partenaireId, compteId: CAISSE_ID, createdById: userId, description: 'Dû au partenaire' },
      ],
    });
    // Mise à jour du solde de caisse (cohérent avec le livre de caisse) :
    // + encaissement puis − reversement ⇒ effet net = commission conservée.
    await tx.compte.update({ where: { id: CAISSE_ID }, data: { solde: { increment: argentCollecte } } });
    await tx.compte.update({ where: { id: CAISSE_ID }, data: { solde: { decrement: reversement } } });
    await this.emit(tx, commande.id, 'COMMISSION', `Commission calculée : ${commission} GNF`, userId, { commission });
    await this.emit(tx, commande.id, 'REVERSEMENT', `Reversement partenaire : ${reversement} GNF`, userId, { reversement });

    // 3. Écriture comptable
    await tx.ecritureComptable.create({
      data: { journal: 'VENTE', dateEcriture: new Date(), compteId: CAISSE_ID, sens: 'CREDIT', montant: argentCollecte, commandeId: commande.id, libelle: `Vente/livraison ${commande.reference}`, createdById: userId },
    });
    await this.emit(tx, commande.id, 'ECRITURE_COMPTABLE', 'Écriture comptable de vente créée', userId);

    // 4. Audit
    await tx.auditLog.create({
      data: { userId, action: 'DELIVER', entite: 'commandes', entiteId: commande.id, avant: { statut: commande.statut }, apres: { statut: 'LIVREE', argentCollecte, commission, reversement } },
    });

    return { argentCollecte, commission, reversement };
  }
}
