import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

@Schema({ timestamps: true })
export class SubCategory {
  @Prop({
    trim: true,
    unique: true,
    minlength: [2, 'To short SubCategory name'],
    maxlength: [32, 'To long SubCategory name'],
  })
  name?: string;

  @Prop({ trim: true, maxlength: [32, 'To long SubCategory name'] })
  nameAr?: string;

  @Prop({ lowercase: true })
  slug?: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'SubCategory must be belong to parent category'],
  })
  category: Types.ObjectId;
}

export type SubCategoryDocument = HydratedDocument<SubCategory>;
export const SubCategorySchema = SchemaFactory.createForClass(SubCategory);
