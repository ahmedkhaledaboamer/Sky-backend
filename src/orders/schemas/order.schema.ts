import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

@Schema()
export class OrderItem {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Product' })
  product: Types.ObjectId;

  @Prop() quantity: number;
  @Prop() color?: string;
  @Prop() price: number;
}
const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

export interface ShippingAddress {
  details?: string;
  phone?: string;
  city?: string;
  postalCode?: string;
}

export const PAYMENT_METHODS = ['card', 'cash'] as const;

@Schema({ timestamps: true })
export class Order {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: [true, 'Order must be belong to user'] })
  user: Types.ObjectId;

  @Prop({ type: [OrderItemSchema] })
  cartItems: Types.DocumentArray<OrderItem>;

  @Prop({ default: 0 })
  taxPrice: number;

  @Prop(raw({ details: String, phone: String, city: String, postalCode: String }))
  shippingAddress: ShippingAddress;

  @Prop({ default: 0 })
  shippingPrice: number;

  @Prop() totalOrderPrice: number;

  @Prop({ type: String, enum: PAYMENT_METHODS, default: 'cash' })
  paymentMethodType: (typeof PAYMENT_METHODS)[number];

  @Prop({ default: false })
  isPaid: boolean;

  @Prop() paidAt?: Date;

  @Prop({ default: false })
  isDelivered: boolean;

  @Prop() deliveredAt?: Date;
}

export type OrderDocument = HydratedDocument<Order>;
export const OrderSchema = SchemaFactory.createForClass(Order);

OrderSchema.pre(/^find/, function (this: { populate: (opts: object) => { populate: (opts: object) => unknown } }) {
  this.populate({ path: 'user', select: 'name profileImg email phone' }).populate({
    path: 'cartItems.product',
    select: 'title titleAr imageCover',
  });
});
