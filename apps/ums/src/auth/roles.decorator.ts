import { SetMetadata } from '@nestjs/common';
import { Public } from './public.decorator.js';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

export { Public };
