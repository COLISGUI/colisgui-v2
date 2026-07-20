import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PacksService {
  constructor(private prisma: PrismaService) {}
  findAll() { return this.prisma.pack.findMany({ where: { actif: true }, orderBy: { prix: 'asc' } }); }
  update(id: string, data: any) { return this.prisma.pack.update({ where: { id }, data }); }
}
