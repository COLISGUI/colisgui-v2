import { IsEnum, IsNotEmpty, IsOptional, IsString, IsNumber } from 'class-validator';
import { PartnerType } from '@prisma/client';

export class CreatePartnerDto {
  @IsString() @IsNotEmpty() nom!: string;
  @IsString() @IsNotEmpty() telephone!: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() adresse?: string;
  @IsOptional() @IsNumber() gpsLat?: number;
  @IsOptional() @IsNumber() gpsLng?: number;
  @IsOptional() @IsEnum(PartnerType) type?: PartnerType;
  @IsOptional() @IsString() commercialId?: string;
  @IsOptional() @IsString() notes?: string;
}
