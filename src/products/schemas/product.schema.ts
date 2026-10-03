import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { applyImageCleanupHooks } from '../../common/uploads/image-cleanup.hooks';
import { applyImageUrlHooks } from '../../common/utils/image-url.hooks';

// { en, ar } pair used for the bilingual product details
@Schema({ _id: false })
export class Localized {
  @Prop({ trim: true }) en?: string;
  @Prop({ trim: true }) ar?: string;
}
const LocalizedSchema = SchemaFactory.createForClass(Localized);

@Schema({
  timestamps: true,
  // to enable virtual populate
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class Product {
  @Prop({
    required: true,
    trim: true,
    minlength: [3, 'Too short product title'],
    maxlength: [100, 'Too long product title'],
  })
  title: string;

  @Prop({ trim: true, maxlength: [100, 'Too long product title'] })
  titleAr?: string;

  @Prop({ required: true, lowercase: true })
  slug: string;

  @Prop({
    required: [true, 'Product description is required'],
    minlength: [20, 'Too short product description'],
  })
  description: string;

  @Prop() descriptionAr?: string;

  @Prop({ type: [LocalizedSchema] }) benefits: Localized[];
  @Prop({ type: [LocalizedSchema] }) ingredients: Localized[];
  @Prop({ type: LocalizedSchema }) directions?: Localized;
  @Prop({ type: [LocalizedSchema] }) sizes: Localized[];

  @Prop({ default: false })
  featured: boolean;

  @Prop({ required: [true, 'Product quantity is required'] })
  quantity: number;

  @Prop({ default: 0 })
  sold: number;

  @Prop({ required: [true, 'Product price is required'], max: [200000, 'Too long product price'] })
  price: number;

  @Prop() priceAfterDiscount?: number;

  @Prop({ type: [String] })
  colors: string[];

  @Prop({ required: [true, 'Product Image cover is required'] })
  imageCover: string;

  @Prop({ type: [String] })
  images: string[];

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Product must be belong to category'],
  })
  category: Types.ObjectId;

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'SubCategory' }] })
  subcategories: Types.ObjectId[];

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Brand' })
  brand?: Types.ObjectId;

  @Prop({
    min: [0, 'Rating must be above or equal 0'],
    max: [5, 'Rating must be below or equal 5.0'],
    set: (val: number) => Math.round(val * 10) / 10, // 3.3333 * 10 => 33.333 => 33 => 3.3
  })
  ratingsAverage?: number;

  @Prop({ default: 0 })
  ratingsQuantity: number;
}

export type ProductDocument = HydratedDocument<Product>;
export const ProductSchema = SchemaFactory.createForClass(Product);

ProductSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'product',
  localField: '_id',
});

// Mongoose query middleware
ProductSchema.pre(/^find/, function (this: { populate: (opts: object) => unknown }) {
  this.populate({ path: 'category', select: 'name nameAr slug' });
});

applyImageUrlHooks(ProductSchema, 'products', { single: ['imageCover'], multiple: ['images'] });
applyImageCleanupHooks(ProductSchema, 'products', ['imageCover', 'images']);
