import { Test } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuthService', () => {
  let service: AuthService;
  const prisma: any = { user: { findFirst: jest.fn() } };
  const jwt: any = { signAsync: jest.fn(), verifyAsync: jest.fn() };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
      ],
    }).compile();
    service = moduleRef.get(AuthService);
    jest.clearAllMocks();
  });

  it('refuse une connexion avec un identifiant inconnu', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    await expect(service.login({ identifiant: 'x', password: 'y' } as any))
      .rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('refuse une connexion sur un compte inactif', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: '1', statut: 'INACTIF', passwordHash: 'h' });
    await expect(service.login({ identifiant: 'x', password: 'y' } as any))
      .rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('mot de passe oublié : réponse neutre si le compte n\'existe pas (anti-énumération)', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    const res = await service.forgotPassword('inconnu');
    expect(res.message).toMatch(/lien de réinitialisation/i);
  });
});
