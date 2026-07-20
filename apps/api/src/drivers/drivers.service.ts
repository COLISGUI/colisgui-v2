import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { AddDocumentDto } from './dto/add-document.dto';
import { PaginationDto, paginated } from '../common/dto/pagination.dto';

@Injectable()
export class DriversService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateDriverDto) { return this.prisma.livreur.create({ data: dto }); }

  async findAll(p: PaginationDto, statut?: string) {
    const where: any = statut ? { statut } : {};
    const [data, total] = await Promise.all([
      this.prisma.livreur.findMany({ where, skip: (p.page - 1) * p.limit, take: p.limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.livreur.count({ where }),
    ]);
    return paginated(data, total, p.page, p.limit);
  }

  async findOne(id: string) {
    const l = await this.prisma.livreur.findUnique({ where: { id }, include: { documents: true } });
    if (!l) throw new NotFoundException('Livreur introuvable');
    return l;
  }

  update(id: string, dto: UpdateDriverDto) { return this.prisma.livreur.update({ where: { id }, data: dto }); }
  remove(id: string) { return this.prisma.livreur.update({ where: { id }, data: { statut: 'INACTIF' } }); }

  addDocument(id: string, dto: AddDocumentDto) {
    return this.prisma.livreurDocument.create({
      data: {
        livreurId: id,
        typeDocument: dto.typeDocument,
        url: dto.url,
        dateExpiration: dto.dateExpiration ? new Date(dto.dateExpiration) : null,
      },
    });
  }

  // Performance : livraisons réussies / affectées, taux, prime estimée
  async performance(id: string) {
    const livreur = await this.prisma.livreur.findUnique({ where: { id } });
    if (!livreur) throw new NotFoundException('Livreur introuvable');
    const [livrees, affectees, refusees, retours] = await Promise.all([
      this.prisma.commande.count({ where: { livreurId: id, statut: 'LIVREE' } }),
      this.prisma.commande.count({ where: { livreurId: id } }),
      this.prisma.commande.count({ where: { livreurId: id, statut: 'REFUSEE' } }),
      this.prisma.commande.count({ where: { livreurId: id, statut: 'RETOUR' } }),
    ]);
    const tauxReussite = affectees ? Math.round((livrees / affectees) * 100) : 0;
    const primeEstimee = Number(livreur.primeBase) * livrees;
    return { livreurId: id, livrees, affectees, refusees, retours, tauxReussite, primeEstimee };
  }
}
