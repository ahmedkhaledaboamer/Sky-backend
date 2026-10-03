import { registerDecorator, ValidationOptions } from 'class-validator';
import validator from 'validator';

// express-validator isMobilePhone([...locales]) — class-validator only types a single locale
export function IsMobilePhoneIn(locales: validator.MobilePhoneLocale[], validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isMobilePhoneIn',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate: (value: unknown) => typeof value === 'string' && validator.isMobilePhone(value, locales),
      },
    });
  };
}
