import { Test } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  const prisma: any = {
    transaction: { findMany: jest.fn(), aggregate: jest.fn() },
    commande: { findMany: jest.fn() },
    partenaire: { findMany: jest.fn() },
    livreur: { findMany: jest.fn() },
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [AnalyticsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(AnalyticsService);
    jest.clearAllMocks();
  });

  it('livre de caisse : calcule un solde courant correct', async () => {
    prisma.transaction.findMany.mockResolvedValue([
      { id: '1', createdAt: new Date(), type: 'COLLECTE', description: 'a', sens: 'ENTREE', montant: 1000 },
      { id: '2', createdAt: new Date(), type: 'DEPENSE', description: 'b', sens: 'SORTIE', montant: 400 },
      { id: '3', createdAt: new Date(), type: 'COLLECTE', description: 'c', sens: 'ENTREE', montant: 250 },
    ]);
    const rows = await service.ledger();
    expect(rows[0].solde).toBe(1000);
    expect(rows[1].solde).toBe(600);
    expect(rows[2].solde).toBe(850);
  });

  it('recherche : ignore les requêtes trop courtes', async () => {
    const res = await service.search('a');
    expect(res).toEqual({ commandes: [], partenaires: [], livreurs: [] });
    expect(prisma.commande.findMany).not.toHaveBeenCalled();
  });
});
