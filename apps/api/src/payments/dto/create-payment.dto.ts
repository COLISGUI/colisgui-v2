import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

// Modes acceptés par ColisGui : espèces et Orange Money uniquement.
export const MODES_AUTORISES = ['ESPECES', 'ORANGE_MONEY'] as const;
export type ModePaiement = (typeof MODES_AUTORISES)[number];

export class CreatePaymentDto {
  @IsString() @IsNotEmpty() commandeId!: string;
  @IsIn(MODES_AUTORISES as unknown as string[]) mode!: ModePaiement;
  @IsNumber() @Min(0) montant!: number;
  @IsOptional() @IsString() clientTelephone?: string; // pour Orange Money
}
