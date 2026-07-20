import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@Controller('users')
@Roles(UserRole.DIRECTEUR, UserRole.ADMIN)
export class UsersController {
  constructor(private users: UsersService) {}

  @Post() create(@Body() dto: CreateUserDto, @CurrentUser('id') id: string) { return this.users.create(dto, id); }
  @Get() findAll(@Query() p: PaginationDto) { return this.users.findAll(p); }
  @Get(':id') findOne(@Param('id') id: string) { return this.users.findOne(id); }
  @Put(':id') update(@Param('id') id: string, @Body() dto: UpdateUserDto) { return this.users.update(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.users.remove(id); }
  @Patch(':id/activate') activate(@Param('id') id: string) { return this.users.setStatut(id, 'ACTIF'); }
  @Patch(':id/deactivate') deactivate(@Param('id') id: string) { return this.users.setStatut(id, 'INACTIF'); }
  @Post(':id/reset-password') reset(@Param('id') id: string) { return this.users.resetPassword(id); }
}
