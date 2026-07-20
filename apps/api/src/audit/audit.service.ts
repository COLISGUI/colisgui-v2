import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationDto, paginated } from '../common/dto/pagination.dto';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}
  async findAll(p: PaginationDto, entite?: string, userId?: string, from?: string, to?: string) {
    const where: any = {};
    if (entite) where.entite = entite;
    if (userId) where.userId = userId;
    if (from || to) where.createdAt = { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) };
    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({ where, skip: (p.page - 1) * p.limit, take: p.limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.auditLog.count({ where }),
    ]);
    return paginated(data, total, p.page, p.limit);
  }

  // Journal des décisions : actions sensibles motivées (motif obligatoire).
  async decisions(p: PaginationDto) {
    const where = { NOT: { raison: null } };
    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({ where, skip: (p.page - 1) * p.limit, take: p.limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.auditLog.count({ where }),
    ]);
    return paginated(data, total, p.page, p.limit);
  }
}
