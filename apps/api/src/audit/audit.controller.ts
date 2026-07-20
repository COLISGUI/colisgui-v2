import { Controller, Get, Query } from '@nestjs/common';
import { AuditService } from './audit.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('audit')
@Roles(UserRole.DIRECTEUR, UserRole.ADMIN, UserRole.COMPTABLE)
export class AuditController {
  constructor(private audit: AuditService) {}
  @Get() findAll(@Query() p: PaginationDto, @Query('entite') entite?: string, @Query('user_id') userId?: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.audit.findAll(p, entite, userId, from, to);
  }

  @Get('decisions') decisions(@Query() p: PaginationDto) { return this.audit.decisions(p); }
}
