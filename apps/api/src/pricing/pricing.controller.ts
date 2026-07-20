import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { PricingService } from './pricing.service';
import { CreateGrilleDto } from './dto/create-grille.dto';
import { UpdatePrixDto } from './dto/update-prix.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@Controller('pricing-grid')
export class PricingController {
  constructor(private pricing: PricingService) {}

  @Get() findAll() { return this.pricing.findAll(); }
  @Get('history') history() { return this.pricing.history(); }
  @Get('quote') quote(@Query('depart') depart: string, @Query('destination') destination: string) {
    return this.pricing.quote(depart, destination);
  }

  @Post() @Roles(UserRole.DIRECTEUR)
  create(@Body() dto: CreateGrilleDto, @CurrentUser('id') id: string) { return this.pricing.create(dto, id); }

  @Put(':id') @Roles(UserRole.DIRECTEUR)
  updatePrix(@Param('id') id: string, @Body() dto: UpdatePrixDto, @CurrentUser('id') userId: string) {
    return this.pricing.updatePrix(id, dto, userId);
  }

  @Delete(':id') @Roles(UserRole.DIRECTEUR)
  deactivate(@Param('id') id: string) { return this.pricing.deactivate(id); }
}
