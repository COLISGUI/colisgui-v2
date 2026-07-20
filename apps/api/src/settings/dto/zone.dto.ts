import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ZoneType } from '@prisma/client';
export class ZoneDto {
  @IsString() @IsNotEmpty() nom!: string;
  @IsEnum(ZoneType) type!: ZoneType;
  @IsOptional() @IsBoolean() actif?: boolean;
}
