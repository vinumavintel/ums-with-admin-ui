import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';

export class AssignRoleDto {
  @ApiProperty({ enum: ['super-admin','admin','read-write','read-only'] })
  @IsIn(['super-admin','admin','read-write','read-only'])
  role!: 'super-admin'|'admin'|'read-write'|'read-only';

  @ApiProperty({ enum: ['add','remove'] })
  @IsString()
  @IsIn(['add','remove'])
  op!: 'add'|'remove';
}
