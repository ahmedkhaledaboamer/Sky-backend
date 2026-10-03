import { instanceToPlain } from 'class-transformer';

// DTO instances (incl. nested ones like Branch.location) => plain objects for mongoose
export const toPlain = (dto: object): Record<string, unknown> => instanceToPlain(dto) as Record<string, unknown>;
