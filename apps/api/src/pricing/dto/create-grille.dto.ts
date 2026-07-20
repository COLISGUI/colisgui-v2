import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
export class CreateGrilleDto {
  @IsString() @IsNotEmpty() pointDepart!: string;
  @IsString() @IsNotEmpty() destination!: string;
  @IsNumber() @Min(0) prix!: number;
  @IsOptional() @IsString() zoneDestinationId?: string;
}
