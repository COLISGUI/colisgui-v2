import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { CreateDebtDto } from './dto/create-debt.dto';

@Injectable()
export class AccountingService {
  constructor(private prisma: PrismaService) {}

  accounts() { return this.prisma.compte.findMany({ where: { actif: true } }); }
  async accountBalance(id: string) {
    const c = await this.prisma.compte.findUnique({ where: { id } });
    return { compteId: id, solde: c?.solde ?? 0 };
  }

  transactions(type?: string, partenaireId?: string) {
    const where: any = {};
    if (type) where.type = type;
    if (partenaireId) where.partenaireId = partenaireId;
    return this.prisma.transaction.findMany({ where, orderBy: { createdAt: 'desc' }, take: 200 });
  }

  entries(journal?: string) {
    const where: any = journal ? { journal } : {};
    return this.prisma.ecritureComptable.findMany({ where, orderBy: { dateEcriture: 'desc' }, take: 200 });
  }

  // Dépense : enregistre + écriture au débit + met à jour le solde du compte
  async createExpense(dto: CreateExpenseDto, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const depense = await tx.depense.create({ data: { ...dto, valideParId: userId } });
      await tx.ecritureComptable.create({
        data: {
          journal: 'ACHAT',
          dateEcriture: new Date(),
          compteId: dto.compteId,
          sens: 'DEBIT',
          montant: dto.montant,
          libelle: `Dépense ${dto.categorie}`,
          createdById: userId,
        },
      });
      await tx.compte.update({ where: { id: dto.compteId }, data: { solde: { decrement: dto.montant } } });
      await tx.transaction.create({
        data: { type: 'DEPENSE', sens: 'SORTIE', montant: dto.montant, compteId: dto.compteId, description: dto.categorie, createdById: userId },
      });
      return depense;
    });
  }

  debts(type?: string, statut?: string) {
    const where: any = {};
    if (type) where.type = type;
    if (statut) where.statut = statut;
    return this.prisma.detteCreance.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  createDebt(dto: CreateDebtDto) {
    return this.prisma.detteCreance.create({
      data: {
        type: dto.type,
        montant: dto.montant,
        partenaireId: dto.partenaireId,
        echeance: dto.echeance ? new Date(dto.echeance) : null,
        description: dto.description,
        statut: 'OUVERTE',
      },
    });
  }

  async settleDebt(id: string, userId: string, raison?: string) {
    if (!raison?.trim()) throw new BadRequestException('Le motif de règlement de la dette est obligatoire.');
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.detteCreance.update({ where: { id }, data: { statut: 'REGLEE' } });
      await tx.auditLog.create({ data: { userId, action: 'REGLEMENT_DETTE', entite: 'dettes_creances', entiteId: id, apres: { statut: 'REGLEE' }, raison } });
      return updated;
    });
  }
}
