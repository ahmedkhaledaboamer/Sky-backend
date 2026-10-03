import { BadRequestException } from '@nestjs/common';

// Same shape express-validator produced, so the frontend keeps reading `path` / `msg`.
export interface FieldError {
  type: 'field';
  value: unknown;
  msg: string;
  path: string;
  location: 'body' | 'params' | 'query';
}

// 400 { errors: [...] } — rendered as-is by the global exception filter
export class ValidationException extends BadRequestException {
  constructor(public readonly errors: FieldError[]) {
    super({ errors });
  }

  static field(
    path: string,
    msg: string,
    value?: unknown,
    location: FieldError['location'] = 'body',
  ): ValidationException {
    return new ValidationException([{ type: 'field', value, msg, path, location }]);
  }
}
