import { IsEnum, IsOptional, IsString } from 'class-validator';
import { OrderStatus } from '@prisma/client';

export class ChangeStatusDto {
  @IsEnum(OrderStatus) statut!: OrderStatus;
  @IsOptional() @IsString() motifId?: string;
  @IsOptional() @IsString() commentaire?: string;
}
