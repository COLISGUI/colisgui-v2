import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
export class CreateDriverDto {
  @IsString() @IsNotEmpty() nom!: string;
  @IsString() @IsNotEmpty() prenom!: string;
  @IsString() @IsNotEmpty() telephone!: string;
  @IsOptional() @IsString() motoImmatriculation?: string;
  @IsOptional() @IsString() motoModele?: string;
  @IsOptional() @IsString() permisNumero?: string;
  @IsOptional() @IsString() cniNumero?: string;
  @IsOptional() @IsNumber() primeBase?: number;
}
