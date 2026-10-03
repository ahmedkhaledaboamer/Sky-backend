import {
  IsArray,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  registerDecorator,
  ValidateIf,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';
import { DocumentExists } from '../../common/validators/database.validators';
import { MinLen, MaxLen } from '../../common/validators/length.validator';
import { IsNumeric } from '../../common/validators/is-numeric.validator';

// priceAfterDiscount must be lower than price (when price is sent)
function LowerThanPrice(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'lowerThanPrice',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const { price } = args.object as { price?: unknown };
          return price === undefined || Number(price) > Number(value);
        },
      },
    });
  };
}

// optional({ nullable: true, checkFalsy: true })
const hasDiscount = (o: { priceAfterDiscount?: unknown }) => Boolean(o.priceAfterDiscount);

interface Localized {
  en?: string;
  ar?: string;
}

export class CreateProductDto {
  @IsNotEmpty({ message: 'Product required' })
  @MinLen(3, { message: 'must be at least 3 chars' })
  title: string;

  @IsNotEmpty({ message: 'Product description is required' })
  @MinLen(20, { message: 'Too short product description' })
  @MaxLen(2000, { message: 'Too long description' })
  description: string;

  @IsNotEmpty({ message: 'Product quantity is required' })
  @IsNumeric({ int: true, min: 0 }, { message: 'Product quantity must be a positive number' })
  quantity: number | string;

  @IsOptional()
  @IsNumeric({ int: true, min: 0 }, { message: 'Product sold must be a number' })
  sold?: number | string;

  @IsNotEmpty({ message: 'Product price is required' })
  @IsNumeric({ min: 0, max: 200000 }, { message: 'Product price must be a number' })
  price: number | string;

  @ValidateIf(hasDiscount)
  @IsNumeric({ min: 0 }, { message: 'Product priceAfterDiscount must be a number' })
  @LowerThanPrice({ message: 'priceAfterDiscount must be lower than price' })
  priceAfterDiscount?: number | string | null;

  @IsOptional()
  @IsArray({ message: 'colors should be array of string' })
  colors?: string[];

  // set by ProductImagesInterceptor from the uploaded file
  @IsNotEmpty({ message: 'Product imageCover is required' })
  imageCover: string;

  @IsOptional()
  @IsArray({ message: 'images should be array of string' })
  images?: string[];

  @IsNotEmpty({ message: 'Product must be belong to a category' })
  @IsMongoId({ message: 'Invalid ID formate' })
  @DocumentExists('Category', 'category')
  category: string;

  @IsOptional()
  @IsArray({ message: 'subcategories should be array of ids' })
  @IsMongoId({ each: true, message: 'Invalid ID formate' })
  subcategories?: string[];

  @IsOptional()
  @IsMongoId({ message: 'Invalid ID formate' })
  @DocumentExists('Brand', 'brand')
  brand?: string | null;

  @IsOptional()
  @IsNumeric({ min: 0, max: 5 }, { message: 'Rating must be between 0 and 5' })
  ratingsAverage?: number | string;

  @IsOptional()
  @IsNumeric({ int: true, min: 0 }, { message: 'ratingsQuantity must be a number' })
  ratingsQuantity?: number | string;

  // not validated, stored as sent
  titleAr?: string;
  descriptionAr?: string;
  benefits?: Localized[];
  ingredients?: Localized[];
  directions?: Localized;
  sizes?: Localized[];
  featured?: boolean | string;
  slug?: string;
}

export class UpdateProductDto {
  @IsOptional()
  @MinLen(3, { message: 'must be at least 3 chars' })
  title?: string;

  @IsOptional()
  @MinLen(20, { message: 'Too short product description' })
  @MaxLen(2000, { message: 'Too long description' })
  description?: string;

  @IsOptional()
  @IsNumeric({ int: true, min: 0 }, { message: 'Product quantity must be a positive number' })
  quantity?: number | string;

  @IsOptional()
  @IsNumeric({ min: 0, max: 200000 }, { message: 'Product price must be a number' })
  price?: number | string;

  @ValidateIf(hasDiscount)
  @IsNumeric({ min: 0 }, { message: 'Product priceAfterDiscount must be a number' })
  @LowerThanPrice({ message: 'priceAfterDiscount must be lower than price' })
  priceAfterDiscount?: number | string | null;

  @IsOptional()
  @IsMongoId({ message: 'Invalid ID formate' })
  @DocumentExists('Category', 'category')
  category?: string;

  @IsOptional()
  @IsArray({ message: 'subcategories should be array of ids' })
  @IsMongoId({ each: true, message: 'Invalid ID formate' })
  subcategories?: string[];

  @IsOptional()
  @IsMongoId({ message: 'Invalid ID formate' })
  @DocumentExists('Brand', 'brand')
  brand?: string | null;

  // not validated on update, stored as sent
  titleAr?: string;
  descriptionAr?: string;
  colors?: string[];
  imageCover?: string;
  images?: string[];
  benefits?: Localized[];
  ingredients?: Localized[];
  directions?: Localized;
  sizes?: Localized[];
  featured?: boolean | string;
  sold?: number | string;
  slug?: string;
}
