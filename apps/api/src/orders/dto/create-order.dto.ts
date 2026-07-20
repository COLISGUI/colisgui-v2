import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateOrderDto {
  @IsString() @IsNotEmpty() partenaireId!: string;
  @IsString() @IsNotEmpty() clientNom!: string;
  @IsString() @IsNotEmpty() clientTelephone!: string;
  @IsString() @IsNotEmpty() clientAdresse!: string;
  @IsOptional() @IsNumber() gpsLat?: number;
  @IsOptional() @IsNumber() gpsLng?: number;
  @IsOptional() @IsString() zoneId?: string;
  @IsNumber() @Min(0) prixProduit!: number;

  // Requis lorsque le partenaire n'est pas abonné (tarification via grille)
  @IsOptional() @IsString() pointDepart?: string;
  @IsOptional() @IsString() destination?: string;

  @IsOptional() @IsString() observations?: string;
}
