import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { PartnersService } from './partners.service';
import { CreatePartnerDto } from './dto/create-partner.dto';
import { UpdatePartnerDto } from './dto/update-partner.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@Controller('partners')
export class PartnersController {
  constructor(private partners: PartnersService) {}

  @Post() @Roles(UserRole.DIRECTEUR, UserRole.ADMIN, UserRole.COMMERCIAL)
  create(@Body() dto: CreatePartnerDto, @CurrentUser('id') id: string) { return this.partners.create(dto, id); }

  @Get() findAll(@Query() p: PaginationDto, @Query('type') type?: string, @Query('statut') statut?: string) {
    return this.partners.findAll(p, type, statut);
  }

  @Get(':id') findOne(@Param('id') id: string) { return this.partners.findOne(id); }

  @Put(':id') @Roles(UserRole.DIRECTEUR, UserRole.ADMIN, UserRole.COMMERCIAL)
  update(@Param('id') id: string, @Body() dto: UpdatePartnerDto) { return this.partners.update(id, dto); }

  @Delete(':id') @Roles(UserRole.DIRECTEUR, UserRole.ADMIN)
  remove(@Param('id') id: string) { return this.partners.remove(id); }

  @Patch(':id/suspend') @Roles(UserRole.DIRECTEUR, UserRole.ADMIN)
  suspend(@Param('id') id: string, @CurrentUser('id') u: string, @Body('raison') raison: string) { return this.partners.suspend(id, u, raison); }

  @Get(':id/orders') orders(@Param('id') id: string, @Query() p: PaginationDto) { return this.partners.orders(id, p); }
}
