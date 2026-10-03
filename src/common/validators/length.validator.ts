import { registerDecorator, ValidationOptions } from 'class-validator';
import validator from 'validator';

// express-validator stringifies values first (undefined / null => ''), so a missing
// field fails `min` but passes `max`. class-validator's MinLength/MaxLength fail on
// any non-string — these keep the Express behaviour.
const toStr = (value: unknown) => (value === undefined || value === null ? '' : String(value));

function lengthDecorator(name: string, options: { min?: number; max?: number }, validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name,
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate: (value: unknown) => validator.isLength(toStr(value), options),
      },
    });
  };
}

export const MinLen = (min: number, validationOptions?: ValidationOptions) =>
  lengthDecorator('minLen', { min }, validationOptions);

export const MaxLen = (max: number, validationOptions?: ValidationOptions) =>
  lengthDecorator('maxLen', { max }, validationOptions);

export const LengthBetween = (min: number, max: number, validationOptions?: ValidationOptions) =>
  lengthDecorator('lengthBetween', { min, max }, validationOptions);
