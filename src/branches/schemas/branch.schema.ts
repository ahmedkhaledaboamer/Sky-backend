import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

// Physical store / pharmacy where the products can be found (shown on the map)
@Schema({ timestamps: true })
export class Branch {
  @Prop({
    trim: true,
    required: [true, 'Branch name required'],
    unique: true,
    maxlength: [60, 'Too long branch name'],
  })
  name: string;

  @Prop({ trim: true, maxlength: [60, 'Too long branch name'] })
  nameAr?: string;

  @Prop({ trim: true, required: [true, 'Branch city required'] })
  city: string;

  @Prop({ trim: true }) cityAr?: string;

  @Prop({ trim: true, required: [true, 'Branch address required'] })
  address: string;

  @Prop({ trim: true }) addressAr?: string;
  @Prop({ trim: true }) phone?: string;
  @Prop({ trim: true }) workingHours?: string;

  @Prop(
    raw({
      lat: {
        type: Number,
        required: [true, 'Latitude required'],
        min: [-90, 'Invalid latitude'],
        max: [90, 'Invalid latitude'],
      },
      lng: {
        type: Number,
        required: [true, 'Longitude required'],
        min: [-180, 'Invalid longitude'],
        max: [180, 'Invalid longitude'],
      },
    }),
  )
  location: { lat: number; lng: number };

  @Prop({ default: false })
  isMain: boolean;

  @Prop({ default: true })
  active: boolean;
}

export type BranchDocument = HydratedDocument<Branch>;
export const BranchSchema = SchemaFactory.createForClass(Branch);
