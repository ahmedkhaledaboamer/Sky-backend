import { applyDecorators, UseGuards } from '@nestjs/common';
import { UserRole } from '../../users/schemas/user.schema';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from './roles.decorator';

// `protect` + optional `allowedTo(...roles)` in one decorator
export const Auth = (...roles: UserRole[]) =>
  applyDecorators(UseGuards(JwtAuthGuard, RolesGuard), ...(roles.length ? [Roles(...roles)] : []));
