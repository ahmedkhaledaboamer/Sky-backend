import { IsNotEmpty, IsOptional } from 'class-validator';
import { MinLen, MaxLen } from '../../common/validators/length.validator';

export class CreateCategoryDto {
  @IsNotEmpty({ message: 'Category required' })
  @MinLen(3, { message: 'Too short category name' })
  @MaxLen(32, { message: 'Too long category name' })
  name: string;

  @IsOptional()
  @MaxLen(32, { message: 'Too long category name' })
  nameAr?: string;

  // set by ResizeImageInterceptor
  image?: string;
}

export class UpdateCategoryDto {
  @IsOptional()
  @MinLen(3, { message: 'Too short category name' })
  @MaxLen(32, { message: 'Too long category name' })
  name?: string;

  @IsOptional()
  @MaxLen(32, { message: 'Too long category name' })
  nameAr?: string;

  image?: string;
}
