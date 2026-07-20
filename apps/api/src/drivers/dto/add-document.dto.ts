import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
export class AddDocumentDto {
  @IsString() @IsNotEmpty() typeDocument!: string;
  @IsString() @IsNotEmpty() url!: string;
  @IsOptional() @IsString() dateExpiration?: string;
}
