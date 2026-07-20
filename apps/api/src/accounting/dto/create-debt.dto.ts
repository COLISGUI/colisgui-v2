import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { DetteType } from '@prisma/client';
export class CreateDebtDto {
  @IsEnum(DetteType) type!: DetteType;
  @IsNumber() @Min(1) montant!: number;
  @IsOptional() @IsString() partenaireId?: string;
  @IsOptional() @IsString() echeance?: string;
  @IsOptional() @IsString() description?: string;
}
