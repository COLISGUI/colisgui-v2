import { Test } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { OrangeMoneyProvider } from './providers/orange-money.provider';
import { RulesEngineService } from '../rules/rules-engine.service';

describe('PaymentsService — espèces & Orange Money', () => {
  let service: PaymentsService;
  const prisma = {
    commande: { findUnique: jest.fn().mockResolvedValue({ id: 'c1', reference: 'CMD-2026-000001' }) },
    paiement: { create: jest.fn((args: any) => Promise.resolve({ id: 'p1', ...args.data })) },
  } as unknown as PrismaService;
  const om = { initiate: jest.fn() } as unknown as OrangeMoneyProvider;
  const rules = { emit: jest.fn() } as unknown as RulesEngineService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: OrangeMoneyProvider, useValue: om },
        { provide: RulesEngineService, useValue: rules },
      ],
    }).compile();
    service = moduleRef.get(PaymentsService);
    jest.clearAllMocks();
    (prisma.commande.findUnique as jest.Mock).mockResolvedValue({ id: 'c1', reference: 'CMD-2026-000001' });
  });

  it('espèces -> paiement PAYE immédiat', async () => {
    const res: any = await service.create({ commandeId: 'c1', mode: 'ESPECES', montant: 50000 } as any, 'u1');
    expect(res.statut).toBe('PAYE');
    expect(res.mode).toBe('ESPECES');
  });

  it('Orange Money simulé -> enregistré comme PAYE avec drapeau simulation', async () => {
    (om.initiate as jest.Mock).mockResolvedValue({ externalRef: 'OM-SIM-x', status: 'SIMULATED' });
    const res: any = await service.create({ commandeId: 'c1', mode: 'ORANGE_MONEY', montant: 75000 } as any, 'u1');
    expect(res.mode).toBe('ORANGE_MONEY');
    expect(res.simulation).toBe(true);
  });

  it('Orange Money réel -> EN_ATTENTE avec lien de paiement', async () => {
    (om.initiate as jest.Mock).mockResolvedValue({ externalRef: 'tok', status: 'INITIATED', paymentUrl: 'https://pay' });
    const res: any = await service.create({ commandeId: 'c1', mode: 'ORANGE_MONEY', montant: 75000 } as any, 'u1');
    expect(res.statut).toBe('EN_ATTENTE');
    expect(res.paymentUrl).toBe('https://pay');
  });
});
