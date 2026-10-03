import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Model, Schema as MongooseSchema, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Review {
  @Prop() title?: string;

  @Prop({
    min: [1, 'Min ratings value is 1.0'],
    max: [5, 'Max ratings value is 5.0'],
    required: [true, 'review ratings required'],
  })
  ratings: number;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: [true, 'Review must belong to user'] })
  user: Types.ObjectId;

  // parent reference (one to many)
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Product', required: [true, 'Review must belong to product'] })
  product: Types.ObjectId;
}

export type ReviewDocument = HydratedDocument<Review>;

export interface ReviewModel extends Model<Review> {
  calcAverageRatingsAndQuantity(productId: Types.ObjectId): Promise<void>;
}

export const ReviewSchema = SchemaFactory.createForClass(Review);

ReviewSchema.pre(/^find/, function (this: { populate: (opts: object) => unknown }) {
  this.populate({ path: 'user', select: 'name' });
});

ReviewSchema.statics.calcAverageRatingsAndQuantity = async function (this: Model<Review>, productId: Types.ObjectId) {
  const result = await this.aggregate<{ avgRatings: number; ratingsQuantity: number }>([
    // Stage 1 : get all reviews in specific product
    { $match: { product: productId } },
    // Stage 2: Grouping reviews based on productID and calc avgRatings, ratingsQuantity
    {
      $group: {
        _id: 'product',
        avgRatings: { $avg: '$ratings' },
        ratingsQuantity: { $sum: 1 },
      },
    },
  ]);

  const Product = this.db.model('Product');
  await Product.findByIdAndUpdate(productId, {
    ratingsAverage: result.length > 0 ? result[0].avgRatings : 0,
    ratingsQuantity: result.length > 0 ? result[0].ratingsQuantity : 0,
  });
};

const recalc = async (doc: ReviewDocument | null) => {
  if (doc) await (doc.constructor as ReviewModel).calcAverageRatingsAndQuantity(doc.product);
};

ReviewSchema.post('save', recalc);
// was post('remove') in Mongoose 6 — document.deleteOne() is used by CrudService.remove
ReviewSchema.post('deleteOne', { document: true, query: false }, recalc);
// findByIdAndUpdate / findByIdAndDelete => keep product ratings in sync
ReviewSchema.post(/^findOneAnd/, recalc);
