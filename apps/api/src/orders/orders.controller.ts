import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { ChangeStatusDto } from './dto/change-status.dto';
import { AssignOrderDto } from './dto/assign-order.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { OrderStatus, UserRole } from '@prisma/client';

@Controller('orders')
export class OrdersController {
  constructor(private orders: OrdersService) {}

  @Post() @Roles(UserRole.DIRECTEUR, UserRole.ADMIN, UserRole.COMMERCIAL)
  create(@Body() dto: CreateOrderDto, @CurrentUser('id') id: string) { return this.orders.create(dto, id); }

  @Get() findAll(@Query() p: PaginationDto, @Query('statut') statut?: OrderStatus, @Query('partenaire_id') partenaireId?: string) {
    return this.orders.findAll(p, statut, partenaireId);
  }

  @Get(':id') findOne(@Param('id') id: string) { return this.orders.findOne(id); }
  @Get(':id/history') history(@Param('id') id: string) { return this.orders.history(id); }
  @Get(':id/flow') flow(@Param('id') id: string) { return this.orders.orderFlow(id); }
  @Get(':id/timeline') timeline(@Param('id') id: string) { return this.orders.timeline(id); }

  @Patch(':id/confirm') @Roles(UserRole.DIRECTEUR, UserRole.ADMIN, UserRole.AGENT_CALL_CENTER)
  confirm(@Param('id') id: string, @CurrentUser('id') u: string) { return this.orders.confirm(id, u); }

  @Patch(':id/assign') @Roles(UserRole.DIRECTEUR, UserRole.ADMIN, UserRole.DISPATCHER)
  assign(@Param('id') id: string, @Body() dto: AssignOrderDto, @CurrentUser('id') u: string) { return this.orders.assign(id, dto, u); }

  @Patch(':id/status')
  changeStatus(@Param('id') id: string, @Body() dto: ChangeStatusDto, @CurrentUser('id') u: string) {
    return this.orders.changeStatus(id, dto, u);
  }
}
