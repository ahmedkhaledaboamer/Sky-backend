import { registerDecorator, ValidationOptions } from 'class-validator';
import validator from 'validator';

interface NumericOptions {
  min?: number;
  max?: number;
  int?: boolean;
}

// express-validator's isFloat / isInt: accepts numbers and numeric strings
// (multipart form fields always arrive as strings).
export function IsNumeric(options: NumericOptions = {}, validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: options.int ? 'isIntLike' : 'isFloatLike',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (value === null || value === undefined || typeof value === 'object') return false;
          const str = String(value);
          const range = { min: options.min, max: options.max };
          return options.int ? validator.isInt(str, range) : validator.isFloat(str, range);
        },
      },
    });
  };
}
