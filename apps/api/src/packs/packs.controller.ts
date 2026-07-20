import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { PacksService } from './packs.service';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('packs')
export class PacksController {
  constructor(private packs: PacksService) {}
  @Get() findAll() { return this.packs.findAll(); }
  @Put(':id') @Roles(UserRole.DIRECTEUR)
  update(@Param('id') id: string, @Body() data: any) { return this.packs.update(id, data); }
}
