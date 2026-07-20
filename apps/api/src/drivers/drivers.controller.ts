import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { DriversService } from './drivers.service';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { AddDocumentDto } from './dto/add-document.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('drivers')
export class DriversController {
  constructor(private drivers: DriversService) {}

  @Post() @Roles(UserRole.DIRECTEUR, UserRole.ADMIN)
  create(@Body() dto: CreateDriverDto) { return this.drivers.create(dto); }

  @Get() findAll(@Query() p: PaginationDto, @Query('statut') statut?: string) { return this.drivers.findAll(p, statut); }
  @Get(':id') findOne(@Param('id') id: string) { return this.drivers.findOne(id); }
  @Get(':id/performance') performance(@Param('id') id: string) { return this.drivers.performance(id); }

  @Put(':id') @Roles(UserRole.DIRECTEUR, UserRole.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateDriverDto) { return this.drivers.update(id, dto); }

  @Delete(':id') @Roles(UserRole.DIRECTEUR, UserRole.ADMIN)
  remove(@Param('id') id: string) { return this.drivers.remove(id); }

  @Post(':id/documents') @Roles(UserRole.DIRECTEUR, UserRole.ADMIN)
  addDocument(@Param('id') id: string, @Body() dto: AddDocumentDto) { return this.drivers.addDocument(id, dto); }
}
