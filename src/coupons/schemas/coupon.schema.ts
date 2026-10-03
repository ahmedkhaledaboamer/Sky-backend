import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ timestamps: true })
export class Coupon {
  @Prop({ trim: true, required: [true, 'Coupon name required'], unique: true })
  name: string;

  @Prop({ required: [true, 'Coupon expire time required'] })
  expire: Date;

  @Prop({ required: [true, 'Coupon discount value required'] })
  discount: number;
}

export type CouponDocument = HydratedDocument<Coupon>;
export const CouponSchema = SchemaFactory.createForClass(Coupon);
