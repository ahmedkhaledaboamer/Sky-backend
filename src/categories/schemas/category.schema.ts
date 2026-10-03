import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { applyImageCleanupHooks } from '../../common/uploads/image-cleanup.hooks';
import { applyImageUrlHooks } from '../../common/utils/image-url.hooks';

@Schema({ timestamps: true })
export class Category {
  @Prop({
    required: [true, 'Category required'],
    unique: true,
    minlength: [3, 'Too short category name'],
    maxlength: [32, 'Too long category name'],
  })
  name: string;

  @Prop({ trim: true, maxlength: [32, 'Too long category name'] })
  nameAr?: string;

  // A and B => shopping.com/a-and-b
  @Prop({ lowercase: true })
  slug?: string;

  @Prop() image?: string;
}

export type CategoryDocument = HydratedDocument<Category>;
export const CategorySchema = SchemaFactory.createForClass(Category);
applyImageUrlHooks(CategorySchema, 'categories', { single: ['image'] });
applyImageCleanupHooks(CategorySchema, 'categories', ['image']);
