import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
export class DispatchAssignDto {
  @IsString() @IsNotEmpty() commandeId!: string;
  @IsString() @IsNotEmpty() livreurId!: string;
  @IsOptional() @IsInt() priorite?: number;
}
