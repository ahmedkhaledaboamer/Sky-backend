import { Transform } from 'class-transformer';
import { IsISO8601, IsNotEmpty, IsOptional } from 'class-validator';
import { IsNumeric } from '../../common/validators/is-numeric.validator';

// body('name').trim() ... .customSanitizer((v) => String(v).toUpperCase())
const toCouponName = ({ value }: { value: unknown }) =>
  value === undefined || value === null ? value : String(value).trim().toUpperCase();

export class CreateCouponDto {
  @Transform(toCouponName, { toClassOnly: true })
  @IsNotEmpty({ message: 'Coupon name required' })
  name: string;

  @IsNotEmpty({ message: 'Coupon expire time required' })
  @IsISO8601({}, { message: 'Invalid expire date' })
  expire: string;

  @IsNotEmpty({ message: 'Coupon discount value required' })
  @IsNumeric({ min: 1, max: 100 }, { message: 'Discount must be between 1 and 100' })
  discount: number | string;
}

export class UpdateCouponDto {
  @IsOptional()
  @Transform(toCouponName, { toClassOnly: true })
  @IsNotEmpty({ message: 'Coupon name required' })
  name?: string;

  @IsOptional()
  @IsISO8601({}, { message: 'Invalid expire date' })
  expire?: string;

  @IsOptional()
  @IsNumeric({ min: 1, max: 100 }, { message: 'Discount must be between 1 and 100' })
  discount?: number | string;
}
