import { Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginationDto, paginated } from '../common/dto/pagination.dto';

const publicSelect = {
  id: true, nom: true, prenom: true, telephone: true, email: true,
  role: true, statut: true, derniereConnexion: true, createdAt: true,
};

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateUserDto, createdById?: string) {
    const passwordHash = await bcrypt.hash(dto.motDePasse, 10);
    return this.prisma.user.create({
      data: {
        nom: dto.nom, prenom: dto.prenom, telephone: dto.telephone,
        email: dto.email, passwordHash, role: dto.role, createdById,
      },
      select: publicSelect,
    });
  }

  async findAll(p: PaginationDto) {
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({ select: publicSelect, skip: (p.page - 1) * p.limit, take: p.limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.user.count(),
    ]);
    return paginated(data, total, p.page, p.limit);
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: publicSelect });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    return user;
  }

  update(id: string, dto: UpdateUserDto) {
    return this.prisma.user.update({ where: { id }, data: dto, select: publicSelect });
  }

  remove(id: string) {
    return this.prisma.user.update({ where: { id }, data: { statut: 'INACTIF' }, select: publicSelect });
  }

  setStatut(id: string, statut: 'ACTIF' | 'INACTIF') {
    return this.prisma.user.update({ where: { id }, data: { statut }, select: publicSelect });
  }

  async resetPassword(id: string) {
    const temp = Math.random().toString(36).slice(-10);
    const passwordHash = await bcrypt.hash(temp, 10);
    await this.prisma.user.update({ where: { id }, data: { passwordHash } });
    return { message: 'Mot de passe réinitialisé', motDePasseTemporaire: temp };
  }
}
