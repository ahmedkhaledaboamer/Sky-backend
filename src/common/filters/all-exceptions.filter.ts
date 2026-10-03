import { ArgumentsHost, Catch, ExceptionFilter, HttpException, NotFoundException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ValidationException } from '../exceptions/validation.exception';

interface NormalizedError {
  statusCode: number;
  message: string;
  original: unknown;
}

interface MongooseLikeError {
  name?: string;
  code?: number;
  path?: string;
  value?: unknown;
  keyValue?: Record<string, unknown>;
  errors?: Record<string, { message: string }>;
  message?: string;
  stack?: string;
}

// Port of middleWares/globalError.js: same status codes, messages and body shape
// ({ status, message } in production, + error/stack in development).
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    if (exception instanceof ValidationException) {
      res.status(400).json({ errors: exception.errors });
      return;
    }

    const err = this.normalize(exception, req);
    const status = `${err.statusCode}`.startsWith('4') ? 'fail' : 'error';

    if (process.env.NODE_ENV === 'development') {
      const raw = err.original as MongooseLikeError;
      res.status(err.statusCode).json({
        status,
        error: { ...(typeof raw === 'object' && raw ? raw : {}), statusCode: err.statusCode, status },
        message: err.message,
        stack: raw?.stack,
      });
      return;
    }
    res.status(err.statusCode).json({ status, message: err.message });
  }

  private normalize(exception: unknown, req: Request): NormalizedError {
    // unmatched route — the Express app answered 400 here
    if (exception instanceof NotFoundException && /^Cannot [A-Z]+ /.test(exception.message)) {
      return { statusCode: 400, message: `can't find this route ${req.originalUrl}`, original: exception };
    }
    if (exception instanceof HttpException) {
      return { statusCode: exception.getStatus(), message: exception.message, original: exception };
    }

    const err = (exception ?? {}) as MongooseLikeError;
    const fail = (message: string, statusCode = 400): NormalizedError => ({ statusCode, message, original: exception });

    if (err.name === 'JsonWebTokenError') return fail('Invalid token, please login again..', 401);
    if (err.name === 'TokenExpiredError') return fail('Expired token, please login again..', 401);
    if (err.name === 'CastError') return fail(`Invalid ${err.path}: ${String(err.value)}`);
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue ?? {})[0] ?? 'field';
      return fail(`This ${field} already exists`);
    }
    if (err.name === 'ValidationError' && err.errors) {
      return fail(
        Object.values(err.errors)
          .map((e) => e.message)
          .join(', '),
      );
    }
    if (err.name === 'MulterError') return fail(err.message ?? 'Upload error');

    return { statusCode: 500, message: err.message ?? 'Internal server error', original: exception };
  }
}
