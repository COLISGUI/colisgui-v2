import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { UserRole } from '@prisma/client';

export class CreateUserDto {
  @IsString() @IsNotEmpty() nom!: string;
  @IsString() @IsNotEmpty() prenom!: string;
  @IsString() @IsNotEmpty() telephone!: string;
  @IsOptional() @IsEmail() email?: string;
  @IsString() @MinLength(8) motDePasse!: string;
  @IsEnum(UserRole) role!: UserRole;
}
