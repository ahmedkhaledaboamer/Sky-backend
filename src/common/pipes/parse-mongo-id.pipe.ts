import { ArgumentMetadata, PipeTransform } from '@nestjs/common';
import { isMongoId } from 'class-validator';
import { ValidationException } from '../exceptions/validation.exception';

// Replaces `check('id').isMongoId().withMessage(...)` route validators.
export class ParseMongoIdPipe implements PipeTransform<string, string> {
  constructor(private readonly message = 'Invalid id format') {}

  transform(value: string, metadata: ArgumentMetadata): string {
    if (!isMongoId(String(value))) {
      throw ValidationException.field(metadata.data ?? 'id', this.message, value, 'params');
    }
    return value;
  }
}
