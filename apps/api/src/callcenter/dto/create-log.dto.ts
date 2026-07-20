import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { CallResult } from '@prisma/client';
export class CreateCallLogDto {
  @IsString() @IsNotEmpty() commandeId!: string;
  @IsEnum(CallResult) resultat!: CallResult;
  @IsOptional() @IsString() motifId?: string;
  @IsOptional() @IsString() scriptId?: string;
  @IsOptional() @IsString() commentaire?: string;
}
