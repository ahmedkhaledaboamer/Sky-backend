import { CallHandler, ExecutionContext, Injectable, NestInterceptor, Type, mixin } from '@nestjs/common';
import type { Request } from 'express';
import { Observable } from 'rxjs';

type DefaultsFactory = (req: Request) => Record<string, unknown>;

// Fills missing body fields before validation runs — replaces Express middlewares like
// setCategoryIdToBody (nested route param => body.category).
export function BodyDefaultsInterceptor(factory: DefaultsFactory): Type<NestInterceptor> {
  @Injectable()
  class BodyDefaultsMixin implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
      const req = context.switchToHttp().getRequest<Request>();
      const body = (req.body ?? {}) as Record<string, unknown>;
      Object.entries(factory(req)).forEach(([key, value]) => {
        if (!body[key] && value !== undefined) body[key] = value;
      });
      req.body = body;
      return next.handle();
    }
  }
  return mixin(BodyDefaultsMixin);
}
