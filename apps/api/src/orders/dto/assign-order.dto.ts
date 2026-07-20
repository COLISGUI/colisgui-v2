import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
export class AssignOrderDto {
  @IsString() @IsNotEmpty() livreurId!: string;
  @IsOptional() @IsInt() priorite?: number;
}
