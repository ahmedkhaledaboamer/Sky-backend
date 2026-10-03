import { IsMongoId, IsNotEmpty, IsOptional } from 'class-validator';
import { DocumentExists } from '../../common/validators/database.validators';
import { MinLen, MaxLen } from '../../common/validators/length.validator';

export class CreateSubCategoryDto {
  @IsNotEmpty({ message: 'SubCategory required' })
  @MinLen(2, { message: 'Too short SubCategory name' })
  @MaxLen(32, { message: 'Too long SubCategory name' })
  name: string;

  @IsOptional()
  @MaxLen(32, { message: 'Too long SubCategory name' })
  nameAr?: string;

  // filled from /categories/:categoryId/subcategory when missing
  @IsNotEmpty({ message: 'subCategory must be belong to category' })
  @IsMongoId({ message: 'Invalid category id format' })
  @DocumentExists('Category', 'category')
  category: string;
}

export class UpdateSubCategoryDto {
  @IsOptional()
  @MinLen(2, { message: 'Too short SubCategory name' })
  @MaxLen(32, { message: 'Too long SubCategory name' })
  name?: string;

  @IsOptional()
  @MaxLen(32, { message: 'Too long SubCategory name' })
  nameAr?: string;

  @IsOptional()
  @IsMongoId({ message: 'Invalid category id format' })
  @DocumentExists('Category', 'category')
  category?: string;
}
