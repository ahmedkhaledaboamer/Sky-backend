import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import {
  isMongoId,
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { Connection } from 'mongoose';

// Async (database) checks that express-validator ran in the same chain as the format
// checks, so their errors land in the same `errors[]` list. Resolved through Nest DI
// (useContainer in main.ts). Request-dependent checks (e.g. "email is free except
// for this user") stay in the services.
export const DATABASE_CONSTRAINTS = new Set(['documentExists', 'emailAvailable']);

const isBlank = (value: unknown) => value === undefined || value === null || value === '';

@ValidatorConstraint({ name: 'documentExists', async: true })
@Injectable()
export class DocumentExistsConstraint implements ValidatorConstraintInterface {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  async validate(value: unknown, args: ValidationArguments): Promise<boolean> {
    // presence / id format are reported by IsNotEmpty / IsMongoId
    if (isBlank(value) || !isMongoId(String(value))) return true;
    const [modelName] = args.constraints as [string];
    return Boolean(await this.connection.model(modelName).exists({ _id: value }));
  }
}

@ValidatorConstraint({ name: 'emailAvailable', async: true })
@Injectable()
export class EmailAvailableConstraint implements ValidatorConstraintInterface {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  async validate(value: unknown, args: ValidationArguments): Promise<boolean> {
    if (isBlank(value)) return true;
    const [lowercase] = args.constraints as [boolean];
    const email = lowercase ? String(value).toLowerCase() : value;
    return !(await this.connection.model('User').exists({ email }));
  }
}

// `No category for this id: <id>` style check
export function DocumentExists(modelName: string, label: string, validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      constraints: [modelName],
      options: { message: ({ value }) => `No ${label} for this id: ${String(value)}`, ...validationOptions },
      validator: DocumentExistsConstraint,
    });
  };
}

export function EmailAvailable(options: { lowercase: boolean; message: string }) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      constraints: [options.lowercase],
      options: { message: options.message },
      validator: EmailAvailableConstraint,
    });
  };
}
