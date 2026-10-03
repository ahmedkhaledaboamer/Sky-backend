import { ValidationError, ValidationPipe } from '@nestjs/common';
import { FieldError, ValidationException } from '../exceptions/validation.exception';
import { DATABASE_CONSTRAINTS } from '../validators/database.validators';

// class-validator records constraints bottom-up (decorators apply in reverse), and async
// ones after the sync ones. Reversing + moving database checks last gives the
// top-down order express-validator reported (format checks first, then the DB check).
const orderedMessages = (constraints: Record<string, string> = {}) => {
  const entries = Object.entries(constraints).reverse();
  return [
    ...entries.filter(([name]) => !DATABASE_CONSTRAINTS.has(name)),
    ...entries.filter(([name]) => DATABASE_CONSTRAINTS.has(name)),
  ].map(([, msg]) => msg);
};

// Flattens class-validator errors (including nested ones, e.g. location.lat)
// into the express-validator list format.
const flatten = (errors: ValidationError[], parent = ''): FieldError[] =>
  errors.flatMap((error) => {
    const path = parent
      ? /^\d+$/.test(error.property)
        ? `${parent}[${error.property}]`
        : `${parent}.${error.property}`
      : error.property;
    const own = orderedMessages(error.constraints).map((msg) => ({
      type: 'field' as const,
      value: error.value,
      msg,
      path,
      location: 'body' as const,
    }));
    return [...own, ...flatten(error.children ?? [], path)];
  });

export const createValidationPipe = () =>
  new ValidationPipe({
    // keep the whole body (mongoose `strict` drops unknown fields, like before)
    transform: true,
    whitelist: false,
    exceptionFactory: (errors) => new ValidationException(flatten(errors)),
  });
