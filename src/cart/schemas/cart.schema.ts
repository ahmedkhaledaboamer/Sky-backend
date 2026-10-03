import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

@Schema()
export class CartItem {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Product' })
  product: Types.ObjectId;

  @Prop({ default: 1 })
  quantity: number;

  @Prop() color?: string;
  @Prop() price: number;
}
const CartItemSchema = SchemaFactory.createForClass(CartItem);

@Schema({ timestamps: true })
export class Cart {
  @Prop({ type: [CartItemSchema] })
  cartItems: Types.DocumentArray<CartItem>;

  @Prop() totalCartPrice?: number;
  @Prop() totalPriceAfterDiscount?: number;

  // name of the coupon applied on the cart (cleared when the cart changes)
  @Prop() coupon?: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  user: Types.ObjectId;
}

export type CartDocument = HydratedDocument<Cart>;
export const CartSchema = SchemaFactory.createForClass(Cart);
