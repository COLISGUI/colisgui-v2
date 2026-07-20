import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePartnerDto } from './dto/create-partner.dto';
import { UpdatePartnerDto } from './dto/update-partner.dto';
import { PaginationDto, paginated } from '../common/dto/pagination.dto';

@Injectable()
export class PartnersService {
  constructor(private prisma: PrismaService) {}

  private async genCode() {
    const count = await this.prisma.partenaire.count();
    return 'PART-' + String(count + 1).padStart(5, '0');
  }

  async create(dto: CreatePartnerDto, createdById?: string) {
    for (let attempt = 0; ; attempt++) {
      try {
        const code = await this.genCode();
        return await this.prisma.partenaire.create({ data: { ...dto, code, createdById } });
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002' && attempt < 5) {
          // collision de code OU de téléphone : on rejoue seulement si c'est le code
          const target = (e.meta as any)?.target;
          if (Array.isArray(target) ? target.includes('code') : String(target).includes('code')) continue;
        }
        throw e;
      }
    }
  }

  async findAll(p: PaginationDto, type?: string, statut?: string) {
    const where: any = {};
    if (type) where.type = type;
    if (statut) where.statut = statut;
    const [data, total] = await Promise.all([
      this.prisma.partenaire.findMany({ where, skip: (p.page - 1) * p.limit, take: p.limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.partenaire.count({ where }),
    ]);
    return paginated(data, total, p.page, p.limit);
  }

  async findOne(id: string) {
    const partenaire = await this.prisma.partenaire.findUnique({
      where: { id },
      include: { abonnements: { where: { statut: 'ACTIVE' }, include: { pack: true } } },
    });
    if (!partenaire) throw new NotFoundException('Partenaire introuvable');
    return partenaire;
  }

  update(id: string, dto: UpdatePartnerDto) {
    return this.prisma.partenaire.update({ where: { id }, data: dto });
  }

  remove(id: string) {
    return this.prisma.partenaire.update({ where: { id }, data: { statut: 'INACTIF' } });
  }

  async suspend(id: string, userId: string, raison?: string) {
    if (!raison?.trim()) throw new BadRequestException('Le motif de suspension du partenaire est obligatoire.');
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.partenaire.update({ where: { id }, data: { statut: 'SUSPENDU' } });
      await tx.auditLog.create({ data: { userId, action: 'SUSPENSION_PARTENAIRE', entite: 'partenaires', entiteId: id, apres: { statut: 'SUSPENDU' }, raison } });
      return updated;
    });
  }

  orders(id: string, p: PaginationDto) {
    return this.prisma.commande.findMany({ where: { partenaireId: id }, skip: (p.page - 1) * p.limit, take: p.limit, orderBy: { createdAt: 'desc' } });
  }
}
