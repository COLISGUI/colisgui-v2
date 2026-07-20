import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { UserRole } from '@prisma/client';

export class UpdateUserDto {
  @IsOptional() @IsString() nom?: string;
  @IsOptional() @IsString() prenom?: string;
  @IsOptional() @IsString() telephone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsEnum(UserRole) role?: UserRole;
}
