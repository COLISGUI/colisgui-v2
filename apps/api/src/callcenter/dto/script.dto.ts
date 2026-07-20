import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
export class ScriptDto {
  @IsString() @IsNotEmpty() titre!: string;
  @IsString() @IsNotEmpty() contenu!: string;
  @IsOptional() @IsBoolean() actif?: boolean;
}
