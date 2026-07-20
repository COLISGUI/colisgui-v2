import { IsNotEmpty, IsString } from 'class-validator';
export class CreateSubscriptionDto {
  @IsString() @IsNotEmpty() partenaireId!: string;
  @IsString() @IsNotEmpty() packId!: string;
}
