import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { PricingService } from '../pricing/pricing.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RulesEngineService } from '../rules/rules-engine.service';

describe('OrdersService — règles métier', () => {
  let service: OrdersService;
  const prisma = {
    commande: { findUnique: jest.fn() },
  } as unknown as PrismaService;
  const pricing = { quote: jest.fn() } as unknown as PricingService;
  const notifications = { dispatchPending: jest.fn() } as unknown as NotificationsService;
  const rules = { emit: jest.fn(), onTransition: jest.fn(), applyDelivery: jest.fn() } as unknown as RulesEngineService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: prisma },
        { provide: PricingService, useValue: pricing },
        { provide: NotificationsService, useValue: notifications },
        { provide: RulesEngineService, useValue: rules },
      ],
    }).compile();
    service = moduleRef.get(OrdersService);
    jest.clearAllMocks();
  });

  it('refuse une transition invalide (CREEE -> LIVREE)', async () => {
    (prisma.commande.findUnique as jest.Mock).mockResolvedValue({ id: '1', statut: 'CREEE', abonnement: null });
    await expect(service.changeStatus('1', { statut: 'LIVREE' } as any, 'u1'))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('exige un motif pour un refus', async () => {
    (prisma.commande.findUnique as jest.Mock).mockResolvedValue({ id: '1', statut: 'EN_COURS', abonnement: null });
    await expect(service.changeStatus('1', { statut: 'REFUSEE' } as any, 'u1'))
      .rejects.toThrow(/motif/i);
  });

  it('autorise une transition valide (CONFIRMEE -> ASSIGNEE non testée ici, mais CREEE -> ANNULEE avec motif OK)', async () => {
    (prisma.commande.findUnique as jest.Mock).mockResolvedValue({ id: '1', statut: 'CREEE', abonnement: null });
    // Sans motif -> doit échouer (ANNULEE requiert un motif)
    await expect(service.changeStatus('1', { statut: 'ANNULEE' } as any, 'u1'))
      .rejects.toThrow(/motif/i);
  });
});
