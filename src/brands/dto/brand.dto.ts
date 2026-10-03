import { IsNotEmpty, IsOptional } from 'class-validator';
import { MinLen, MaxLen } from '../../common/validators/length.validator';

export class CreateBrandDto {
  @IsNotEmpty({ message: 'Brand required' })
  @MinLen(3, { message: 'Too short brand name' })
  @MaxLen(32, { message: 'Too long brand name' })
  name: string;

  @IsOptional()
  @MaxLen(32, { message: 'Too long brand name' })
  nameAr?: string;

  // set by ResizeImageInterceptor
  image?: string;
}

export class UpdateBrandDto {
  @IsOptional()
  @MinLen(3, { message: 'Too short brand name' })
  @MaxLen(32, { message: 'Too long brand name' })
  name?: string;

  @IsOptional()
  @MaxLen(32, { message: 'Too long brand name' })
  nameAr?: string;

  image?: string;
}
