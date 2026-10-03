import type { UserDocument } from '../users/schemas/user.schema';

declare global {
  namespace Express {
    interface Request {
      // set by JwtAuthGuard
      user?: UserDocument;
    }
  }
}

export {};
