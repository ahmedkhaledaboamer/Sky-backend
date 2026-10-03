import { Global, Module } from '@nestjs/common';
import { DocumentExistsConstraint, EmailAvailableConstraint } from './validators/database.validators';

// Providers for the class-validator constraints that need the database
@Global()
@Module({
  providers: [DocumentExistsConstraint, EmailAvailableConstraint],
  exports: [DocumentExistsConstraint, EmailAvailableConstraint],
})
export class CommonModule {}
