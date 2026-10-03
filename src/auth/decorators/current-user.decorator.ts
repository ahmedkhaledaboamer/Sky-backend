import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { UserDocument } from '../../users/schemas/user.schema';

// The user attached by JwtAuthGuard
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): UserDocument =>
    context.switchToHttp().getRequest<Request>().user as UserDocument,
);
