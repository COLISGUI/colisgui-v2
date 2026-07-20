import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  private async sumTransactions(type: string, from: Date, to: Date) {
    const r = await this.prisma.transaction.aggregate({
      _sum: { montant: true },
      where: { type: type as any, createdAt: { gte: from, lt: to } },
    });
    return Number(r._sum.montant ?? 0);
  }

  private async statusBreakdown(from: Date, to: Date) {
    const rows = await this.prisma.commande.groupBy({
      by: ['statut'],
      _count: { _all: true },
      where: { createdAt: { gte: from, lt: to } },
    });
    return rows.reduce((acc, r) => ({ ...acc, [r.statut]: r._count._all }), {} as Record<string, number>);
  }

  async period(from: Date, to: Date) {
    const [statuts, encaissements, commissions, reversements, depenses] = await Promise.all([
      this.statusBreakdown(from, to),
      this.sumTransactions('COLLECTE', from, to),
      this.sumTransactions('COMMISSION', from, to),
      this.sumTransactions('REVERSEMENT', from, to),
      this.sumTransactions('DEPENSE', from, to),
    ]);
    return {
      periode: { from, to },
      commandes: statuts,
      livraisons: statuts['LIVREE'] ?? 0,
      finances: { encaissements, commissions, reversements, depenses, resultatNet: commissions - depenses },
    };
  }

  daily(dateStr?: string) {
    const d = dateStr ? new Date(dateStr) : new Date();
    const from = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const to = new Date(from.getTime() + 24 * 3600 * 1000);
    return this.period(from, to);
  }

  monthly(monthStr?: string) {
    const base = monthStr ? new Date(monthStr + '-01') : new Date();
    const from = new Date(base.getFullYear(), base.getMonth(), 1);
    const to = new Date(base.getFullYear(), base.getMonth() + 1, 1);
    return this.period(from, to);
  }

  annual(yearStr?: string) {
    const year = yearStr ? Number(yearStr) : new Date().getFullYear();
    return this.period(new Date(year, 0, 1), new Date(year + 1, 0, 1));
  }

  async driver(id: string) {
    const [livrees, affectees, refusees, retours] = await Promise.all([
      this.prisma.commande.count({ where: { livreurId: id, statut: 'LIVREE' } }),
      this.prisma.commande.count({ where: { livreurId: id } }),
      this.prisma.commande.count({ where: { livreurId: id, statut: 'REFUSEE' } }),
      this.prisma.commande.count({ where: { livreurId: id, statut: 'RETOUR' } }),
    ]);
    return { livreurId: id, livrees, affectees, refusees, retours, tauxReussite: affectees ? Math.round((livrees / affectees) * 100) : 0 };
  }

  async commercial(id: string) {
    const partenaires = await this.prisma.partenaire.findMany({ where: { commercialId: id }, select: { id: true, nom: true, type: true } });
    const ids = partenaires.map((p) => p.id);
    const [abonnements, commandes] = await Promise.all([
      this.prisma.abonnement.count({ where: { partenaireId: { in: ids } } }),
      this.prisma.commande.count({ where: { partenaireId: { in: ids } } }),
    ]);
    return { commercialId: id, nombrePartenaires: partenaires.length, abonnementsVendus: abonnements, commandes, partenaires };
  }

  async partner(id: string) {
    const [commandes, livrees, reversements] = await Promise.all([
      this.prisma.commande.count({ where: { partenaireId: id } }),
      this.prisma.commande.count({ where: { partenaireId: id, statut: 'LIVREE' } }),
      this.prisma.transaction.aggregate({ _sum: { montant: true }, where: { partenaireId: id, type: 'REVERSEMENT' } }),
    ]);
    return { partenaireId: id, commandes, livrees, totalReverse: Number(reversements._sum.montant ?? 0) };
  }
}
