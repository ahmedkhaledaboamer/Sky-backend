import { IsMongoId, IsNotEmpty } from 'class-validator';
import { IsNumeric } from '../../common/validators/is-numeric.validator';

export class CreateReviewDto {
  title?: string;

  @IsNotEmpty({ message: 'ratings value required' })
  @IsNumeric({ min: 1, max: 5 }, { message: 'Ratings value must be between 1 to 5' })
  ratings: number | string;

  // user / product default to the logged user and /products/:productId
  @IsMongoId({ message: 'Invalid Review id format' })
  user: string;

  @IsMongoId({ message: 'Invalid Review id format' })
  product: string;
}

// PUT /reviews/:id had no body validation (only the ownership check)
export interface UpdateReviewBody {
  title?: string;
  ratings?: number;
}
