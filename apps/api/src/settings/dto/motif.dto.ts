import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { MotifCategorie } from '@prisma/client';
export class MotifDto {
  @IsString() @IsNotEmpty() code!: string;
  @IsString() @IsNotEmpty() libelle!: string;
  @IsEnum(MotifCategorie) categorie!: MotifCategorie;
  @IsOptional() @IsBoolean() actif?: boolean;
}
