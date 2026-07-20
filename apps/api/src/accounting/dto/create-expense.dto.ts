import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { PaymentMode } from '@prisma/client';
export class CreateExpenseDto {
  @IsString() @IsNotEmpty() categorie!: string;
  @IsNumber() @Min(1) montant!: number;
  @IsEnum(PaymentMode) modePaiement!: PaymentMode;
  @IsString() @IsNotEmpty() compteId!: string;
  @IsOptional() @IsString() justificatifUrl?: string;
  @IsOptional() @IsString() description?: string;
}
