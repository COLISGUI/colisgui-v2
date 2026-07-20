import { IsNotEmpty, IsString } from 'class-validator';
export class LoginDto {
  @IsString() @IsNotEmpty() identifiant!: string; // téléphone ou email
  @IsString() @IsNotEmpty() password!: string;
}
