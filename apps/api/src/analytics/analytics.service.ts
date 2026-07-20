import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const ALL_STATUS = ['CREEE','CONFIRMEE','ASSIGNEE','EN_COURS','LIVREE','REFUSEE','ANNULEE','RETOUR'] as const;
const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  // #3 — Pipeline opérationnel : nombre de commandes par étape
  async pipeline() {
    const rows = await this.prisma.commande.groupBy({ by: ['statut'], _count: { _all: true } });
    const counts: Record<string, number> = {};
    for (const s of ALL_STATUS) counts[s] = 0;
    for (const r of rows) counts[r.statut] = r._count._all;
    counts['TOTAL'] = Object.values(counts).reduce((a, b) => a + b, 0);
    return counts;
  }

  private async sumTx(type: string, from: Date, to: Date) {
    const r = await this.prisma.transaction.aggregate({ _sum: { montant: true }, where: { type: type as any, createdAt: { gte: from, lt: to } } });
    return Number(r._sum.montant ?? 0);
  }

  // #11 — Tableau de bord Directeur (indicateurs stratégiques)
  async director(fromStr?: string, toStr?: string) {
    const to = toStr ? new Date(toStr) : new Date();
    const from = fromStr ? new Date(fromStr) : new Date(to.getTime() - 30 * 24 * 3600 * 1000);
    const hours = Math.max(1, (to.getTime() - from.getTime()) / 3600000);

    const [encaissements, commissions, reversements, depenses, totalCommandes, livrees] = await Promise.all([
      this.sumTx('COLLECTE', from, to),
      this.sumTx('COMMISSION', from, to),
      this.sumTx('REVERSEMENT', from, to),
      this.sumTx('DEPENSE', from, to),
      this.prisma.commande.count({ where: { createdAt: { gte: from, lt: to } } }),
      this.prisma.commandeEvenement.count({ where: { type: 'LIVRAISON', createdAt: { gte: from, lt: to } } }),
    ]);

    // Temps moyen de livraison (création -> évènement LIVRAISON)
    const livraisons = await this.prisma.commandeEvenement.findMany({
      where: { type: 'LIVRAISON', createdAt: { gte: from, lt: to } },
      include: { commande: { select: { createdAt: true } } },
      take: 500,
    });
    let tempsMoyenMinutes = 0;
    if (livraisons.length) {
      const total = livraisons.reduce((s, e) => s + (e.createdAt.getTime() - e.commande.createdAt.getTime()), 0);
      tempsMoyenMinutes = Math.round(total / livraisons.length / 60000);
    }

    // Marge par partenaire (commissions)
    const parPartenaire = await this.prisma.transaction.groupBy({
      by: ['partenaireId'], where: { type: 'COMMISSION', createdAt: { gte: from, lt: to }, partenaireId: { not: null } },
      _sum: { montant: true }, orderBy: { _sum: { montant: 'desc' } }, take: 5,
    });
    const partenaireNoms = await this.prisma.partenaire.findMany({ where: { id: { in: parPartenaire.map((p) => p.partenaireId!) } }, select: { id: true, nom: true } });
    const margeParPartenaire = parPartenaire.map((p) => ({
      partenaireId: p.partenaireId, nom: partenaireNoms.find((x) => x.id === p.partenaireId)?.nom ?? '—', marge: Number(p._sum.montant ?? 0),
    }));

    // Marge par livreur (frais des livraisons effectuées)
    const parLivreur = await this.prisma.commande.groupBy({
      by: ['livreurId'], where: { statut: 'LIVREE', livreurId: { not: null }, updatedAt: { gte: from, lt: to } },
      _sum: { fraisLivraison: true }, _count: { _all: true }, orderBy: { _sum: { fraisLivraison: 'desc' } }, take: 5,
    });
    const livreurs = await this.prisma.livreur.findMany({ where: { id: { in: parLivreur.map((l) => l.livreurId!) } }, select: { id: true, nom: true, prenom: true } });
    const margeParLivreur = parLivreur.map((l) => ({
      livreurId: l.livreurId,
      nom: (() => { const d = livreurs.find((x) => x.id === l.livreurId); return d ? `${d.prenom} ${d.nom}` : '—'; })(),
      marge: Number(l._sum.fraisLivraison ?? 0), livraisons: l._count._all,
    }));

    const beneficeNet = commissions - depenses;
    return {
      periode: { from, to },
      beneficeNet, encaissements, commissions, reversements, depenses,
      coutMoyenLivraison: livrees ? Math.round(depenses / livrees) : 0,
      tempsMoyenLivraisonMinutes: tempsMoyenMinutes,
      tauxReussite: totalCommandes ? Math.round((livrees / totalCommandes) * 100) : 0,
      commandesParHeure: Math.round((totalCommandes / hours) * 10) / 10,
      livrees, totalCommandes,
      margeParPartenaire, margeParLivreur,
    };
  }

  // #4 — Score partenaire (0-100)
  async partnerScore(id: string) {
    const partenaire = await this.prisma.partenaire.findUnique({ where: { id } });
    if (!partenaire) return null;
    const [total, livrees, annulees, refusees, dettes] = await Promise.all([
      this.prisma.commande.count({ where: { partenaireId: id } }),
      this.prisma.commande.count({ where: { partenaireId: id, statut: 'LIVREE' } }),
      this.prisma.commande.count({ where: { partenaireId: id, statut: 'ANNULEE' } }),
      this.prisma.commande.count({ where: { partenaireId: id, statut: 'REFUSEE' } }),
      this.prisma.detteCreance.aggregate({ _sum: { montant: true }, where: { partenaireId: id, type: 'DETTE', statut: { not: 'REGLEE' } } }),
    ]);
    const successRate = total ? livrees / total : 0;
    const penaliteAnnulRefus = total ? ((annulees + refusees) / total) * 20 : 0;
    const penaliteDette = Number(dettes._sum.montant ?? 0) > 0 ? 10 : 0;
    const ancienneteMois = Math.floor((Date.now() - partenaire.createdAt.getTime()) / (30 * 24 * 3600 * 1000));
    const bonusAnciennete = Math.min(ancienneteMois, 12) * 0.5;
    const score = clamp(100 * successRate - penaliteAnnulRefus - penaliteDette + bonusAnciennete);
    return { partenaireId: id, score, total, livrees, annulees, refusees, tauxReussite: Math.round(successRate * 100), detteOuverte: Number(dettes._sum.montant ?? 0), ancienneteMois };
  }

  // #5 — Score livreur (0-100)
  async driverScore(id: string) {
    const [affectees, livrees, refusees, retours] = await Promise.all([
      this.prisma.commande.count({ where: { livreurId: id } }),
      this.prisma.commande.count({ where: { livreurId: id, statut: 'LIVREE' } }),
      this.prisma.commande.count({ where: { livreurId: id, statut: 'REFUSEE' } }),
      this.prisma.commande.count({ where: { livreurId: id, statut: 'RETOUR' } }),
    ]);
    const tauxLivraison = affectees ? livrees / affectees : 0;
    const penalite = affectees ? ((refusees + retours) / affectees) * 25 : 0;
    const score = clamp(100 * tauxLivraison - penalite);
    return { livreurId: id, score, affectees, livrees, refusees, retours, tauxLivraison: Math.round(tauxLivraison * 100) };
  }

  async topPartners(limit = 5) {
    // Agrégations groupées (évite le N+1) : 1 requête pour les statuts, 1 pour les dettes.
    const [partners, byStatus, debts] = await Promise.all([
      this.prisma.partenaire.findMany({ where: { statut: 'ACTIF' }, select: { id: true, nom: true, createdAt: true } }),
      this.prisma.commande.groupBy({ by: ['partenaireId', 'statut'], _count: { _all: true } }),
      this.prisma.detteCreance.groupBy({ by: ['partenaireId'], where: { type: 'DETTE', statut: { not: 'REGLEE' }, partenaireId: { not: null } }, _sum: { montant: true } }),
    ]);
    const debtByPartner = new Map(debts.map((d) => [d.partenaireId, Number(d._sum.montant ?? 0)]));

    const scored = partners.map((p) => {
      const rows = byStatus.filter((r) => r.partenaireId === p.id);
      const count = (s: string) => rows.find((r) => r.statut === s)?._count._all ?? 0;
      const total = rows.reduce((a, r) => a + r._count._all, 0);
      const livrees = count('LIVREE'), annulees = count('ANNULEE'), refusees = count('REFUSEE');
      const successRate = total ? livrees / total : 0;
      const penaliteAnnulRefus = total ? ((annulees + refusees) / total) * 20 : 0;
      const penaliteDette = (debtByPartner.get(p.id) ?? 0) > 0 ? 10 : 0;
      const ancienneteMois = Math.floor((Date.now() - p.createdAt.getTime()) / (30 * 24 * 3600 * 1000));
      const bonus = Math.min(ancienneteMois, 12) * 0.5;
      const score = clamp(100 * successRate - penaliteAnnulRefus - penaliteDette + bonus);
      return { partenaireId: p.id, nom: p.nom, score, total, livrees, tauxReussite: Math.round(successRate * 100) };
    });
    return scored.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  async topDrivers(limit = 5) {
    const [drivers, byStatus] = await Promise.all([
      this.prisma.livreur.findMany({ where: { statut: 'ACTIF' }, select: { id: true, nom: true, prenom: true } }),
      this.prisma.commande.groupBy({ by: ['livreurId', 'statut'], where: { livreurId: { not: null } }, _count: { _all: true } }),
    ]);
    const scored = drivers.map((d) => {
      const rows = byStatus.filter((r) => r.livreurId === d.id);
      const count = (s: string) => rows.find((r) => r.statut === s)?._count._all ?? 0;
      const affectees = rows.reduce((a, r) => a + r._count._all, 0);
      const livrees = count('LIVREE'), refusees = count('REFUSEE'), retours = count('RETOUR');
      const tauxLivraison = affectees ? livrees / affectees : 0;
      const penalite = affectees ? ((refusees + retours) / affectees) * 25 : 0;
      const score = clamp(100 * tauxLivraison - penalite);
      return { livreurId: d.id, nom: `${d.prenom} ${d.nom}`, score, affectees, livrees };
    });
    return scored.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  // #6 — Livre de caisse (journal financier chronologique avec solde courant)
  async ledger(limit = 200) {
    const txs = await this.prisma.transaction.findMany({
      where: { type: { in: ['COLLECTE', 'REVERSEMENT', 'DEPENSE', 'RECETTE'] } },
      orderBy: { createdAt: 'asc' }, take: limit,
    });
    let solde = 0;
    return txs.map((t) => {
      const montant = Number(t.montant);
      const mouvement = t.sens === 'ENTREE' ? montant : -montant;
      solde += mouvement;
      return { id: t.id, date: t.createdAt, type: t.type, description: t.description, entree: t.sens === 'ENTREE' ? montant : 0, sortie: t.sens === 'SORTIE' ? montant : 0, solde };
    });
  }

  // #10 — Recherche globale
  async search(q: string) {
    if (!q || q.length < 2) return { commandes: [], partenaires: [], livreurs: [] };
    const like = { contains: q, mode: 'insensitive' as const };
    const [commandes, partenaires, livreurs] = await Promise.all([
      this.prisma.commande.findMany({ where: { OR: [{ reference: like }, { clientNom: like }, { clientTelephone: { contains: q } }] }, select: { id: true, reference: true, clientNom: true, clientTelephone: true, statut: true }, take: 5 }),
      this.prisma.partenaire.findMany({ where: { OR: [{ nom: like }, { code: like }, { telephone: { contains: q } }] }, select: { id: true, nom: true, telephone: true, code: true }, take: 5 }),
      this.prisma.livreur.findMany({ where: { OR: [{ nom: like }, { prenom: like }, { telephone: { contains: q } }] }, select: { id: true, nom: true, prenom: true, telephone: true }, take: 5 }),
    ]);
    return { commandes, partenaires, livreurs };
  }
}
