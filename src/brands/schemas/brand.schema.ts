import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { applyImageCleanupHooks } from '../../common/uploads/image-cleanup.hooks';
import { applyImageUrlHooks } from '../../common/utils/image-url.hooks';

@Schema({ timestamps: true })
export class Brand {
  @Prop({
    required: [true, 'brand required'],
    unique: true,
    minlength: [3, 'Too short brand name'],
    maxlength: [32, 'Too long brand name'],
  })
  name: string;

  @Prop({ trim: true, maxlength: [32, 'Too long brand name'] })
  nameAr?: string;

  // A and B => shopping.com/a-and-b
  @Prop({ lowercase: true })
  slug?: string;

  @Prop() image?: string;
}

export type BrandDocument = HydratedDocument<Brand>;
export const BrandSchema = SchemaFactory.createForClass(Brand);
applyImageUrlHooks(BrandSchema, 'brands', { single: ['image'] });
applyImageCleanupHooks(BrandSchema, 'brands', ['image']);
