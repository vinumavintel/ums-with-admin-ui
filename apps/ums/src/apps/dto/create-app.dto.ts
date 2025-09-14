import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateAppDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  name!: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  description?: string;
}
