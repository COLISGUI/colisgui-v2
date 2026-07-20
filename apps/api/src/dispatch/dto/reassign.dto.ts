import { IsNotEmpty, IsString } from 'class-validator';
export class DispatchReassignDto {
  @IsString() @IsNotEmpty() commandeId!: string;
  @IsString() @IsNotEmpty() nouveauLivreurId!: string;
  @IsString() @IsNotEmpty({ message: 'Le motif de réaffectation est obligatoire.' }) raison!: string;
}
