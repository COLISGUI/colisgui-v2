import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { AccountingService } from './accounting.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { CreateDebtDto } from './dto/create-debt.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@Controller()
@Roles(UserRole.DIRECTEUR, UserRole.ADMIN, UserRole.COMPTABLE)
export class AccountingController {
  constructor(private acc: AccountingService) {}

  @Get('accounts') accounts() { return this.acc.accounts(); }
  @Get('accounts/:id/balance') balance(@Param('id') id: string) { return this.acc.accountBalance(id); }
  @Get('transactions') transactions(@Query('type') type?: string, @Query('partenaire_id') pid?: string) { return this.acc.transactions(type, pid); }
  @Get('accounting/entries') entries(@Query('journal') journal?: string) { return this.acc.entries(journal); }

  @Post('expenses') createExpense(@Body() dto: CreateExpenseDto, @CurrentUser('id') u: string) { return this.acc.createExpense(dto, u); }
  @Get('expenses') expenses() { return this.acc.transactions('DEPENSE'); }

  @Get('debts') debts(@Query('type') type?: string, @Query('statut') statut?: string) { return this.acc.debts(type, statut); }
  @Post('debts') createDebt(@Body() dto: CreateDebtDto) { return this.acc.createDebt(dto); }
  @Patch('debts/:id/settle') settle(@Param('id') id: string, @CurrentUser('id') u: string, @Body('raison') raison: string) { return this.acc.settleDebt(id, u, raison); }
}
