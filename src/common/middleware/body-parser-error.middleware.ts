import type { NextFunction, Request, Response } from 'express';

interface BodyParserError extends Error {
  status?: number;
  statusCode?: number;
}

// Errors thrown by express.json() (invalid JSON, payload too large ...) never reach Nest
// exception filters with their original data, so they are answered here, exactly like
// the Express global error handler did (note: `status` is the numeric HTTP status here).
export function bodyParserErrorHandler(err: BodyParserError, _req: Request, res: Response, _next: NextFunction) {
  const statusCode = err.statusCode || 500;
  const status = err.status || 'error';
  if (process.env.NODE_ENV === 'development') {
    res.status(statusCode).json({ status, error: err, message: err.message, stack: err.stack });
    return;
  }
  res.status(statusCode).json({ status, message: err.message });
}
