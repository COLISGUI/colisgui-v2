import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  private async signTokens(userId: string, role: string) {
    const payload = { sub: userId, role };
    const accessToken = await this.jwt.signAsync(payload, {
      secret: process.env.JWT_SECRET ?? 'change-me-access-secret',
      expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
    });
    const refreshToken = await this.jwt.signAsync(payload, {
      secret: process.env.JWT_REFRESH_SECRET ?? 'change-me-refresh-secret',
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
    });
    const tokenHash = await bcrypt.hash(refreshToken, 10);
    await this.prisma.refreshToken.create({
      data: { userId, tokenHash, expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000) },
    });
    return { accessToken, refreshToken };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: { OR: [{ telephone: dto.identifiant }, { email: dto.identifiant }] },
    });
    if (!user) throw new UnauthorizedException('Identifiants invalides');
    if (user.statut !== 'ACTIF') throw new UnauthorizedException('Compte inactif');
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Identifiants invalides');
    await this.prisma.user.update({ where: { id: user.id }, data: { derniereConnexion: new Date() } });
    const tokens = await this.signTokens(user.id, user.role);
    return { user: { id: user.id, nom: user.nom, prenom: user.prenom, role: user.role }, ...tokens };
  }

  async refresh(refreshToken: string) {
    let payload: { sub: string; role: string };
    try {
      payload = await this.jwt.verifyAsync(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET ?? 'change-me-refresh-secret',
      });
    } catch {
      throw new UnauthorizedException('Refresh token invalide');
    }
    const stored = await this.prisma.refreshToken.findMany({
      where: { userId: payload.sub, revoked: false, expiresAt: { gt: new Date() } },
    });
    const matches = await Promise.all(stored.map((t) => bcrypt.compare(refreshToken, t.tokenHash)));
    const idx = matches.findIndex(Boolean);
    if (idx === -1) throw new UnauthorizedException('Session expirée');
    // Rotation : on révoque le token utilisé avant d'en émettre un nouveau.
    await this.prisma.refreshToken.update({ where: { id: stored[idx].id }, data: { revoked: true } });
    return this.signTokens(payload.sub, payload.role);
  }

  async logout(userId: string) {
    await this.prisma.refreshToken.updateMany({ where: { userId, revoked: false }, data: { revoked: true } });
    return { message: 'Déconnexion réussie' };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('Utilisateur introuvable');
    const ok = await bcrypt.compare(dto.ancienMotDePasse, user.passwordHash);
    if (!ok) throw new BadRequestException('Ancien mot de passe incorrect');
    const passwordHash = await bcrypt.hash(dto.nouveauMotDePasse, 10);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    await this.prisma.refreshToken.updateMany({ where: { userId, revoked: false }, data: { revoked: true } });
    return { message: 'Mot de passe modifié' };
  }

  // Demande de réinitialisation : génère un jeton à usage unique (30 min).
  async forgotPassword(identifiant: string) {
    const user = await this.prisma.user.findFirst({
      where: { OR: [{ telephone: identifiant }, { email: identifiant }] },
    });
    // Réponse identique que l'utilisateur existe ou non (anti-énumération).
    if (!user) return { message: 'Si le compte existe, un lien de réinitialisation a été envoyé.' };

    const token = randomBytes(24).toString('hex');
    const tokenHash = await bcrypt.hash(token, 10);
    await this.prisma.passwordReset.create({
      data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 30 * 60 * 1000) },
    });
    // En production : envoyer `token` par SMS/WhatsApp. Ici on le journalise / retourne en dev.
    const devReturn = process.env.NODE_ENV !== 'production' ? { token } : {};
    return { message: 'Si le compte existe, un lien de réinitialisation a été envoyé.', ...devReturn };
  }

  async resetPassword(token: string, nouveauMotDePasse: string) {
    if (!token || nouveauMotDePasse?.length < 8) throw new BadRequestException('Jeton ou mot de passe invalide');
    const candidates = await this.prisma.passwordReset.findMany({
      where: { used: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    let match: (typeof candidates)[number] | undefined;
    for (const c of candidates) {
      if (await bcrypt.compare(token, c.tokenHash)) { match = c; break; }
    }
    if (!match) throw new BadRequestException('Jeton invalide ou expiré');
    const passwordHash = await bcrypt.hash(nouveauMotDePasse, 10);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: match.userId }, data: { passwordHash } }),
      this.prisma.passwordReset.update({ where: { id: match.id }, data: { used: true } }),
      this.prisma.refreshToken.updateMany({ where: { userId: match.userId, revoked: false }, data: { revoked: true } }),
    ]);
    return { message: 'Mot de passe réinitialisé. Vous pouvez vous connecter.' };
  }
}
