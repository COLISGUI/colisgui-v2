import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';
export class UpdatePrixDto {
  @IsNumber() @Min(0) prix!: number;
  @IsString() @IsNotEmpty({ message: 'Le motif de la modification de prix est obligatoire.' }) motif!: string;
}
