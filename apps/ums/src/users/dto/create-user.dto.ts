import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsString } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ enum: ['super-admin','admin','read-write','read-only'] })
  @IsIn(['super-admin','admin','read-write','read-only'])
  role!: 'super-admin'|'admin'|'read-write'|'read-only';

  @ApiPropertyOptional({ description: 'Temporary password to force reset on first login' })
  @IsOptional()
  @IsString()
  tempPassword?: string;
}
