import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CouponsService } from '../coupons/coupons.service';
import { Product } from '../products/schemas/product.schema';
import { Cart, CartDocument } from './schemas/cart.schema';

export interface CartResponse {
  status: 'success';
  message?: string;
  numOfCartItems: number;
  data: CartDocument | { cartItems: never[]; totalCartPrice: number };
}

// the price a customer pays: sale price when there is a valid one
const unitPrice = (product: Pick<Product, 'price' | 'priceAfterDiscount'>) =>
  product.priceAfterDiscount && product.priceAfterDiscount < product.price ? product.priceAfterDiscount : product.price;

const calcTotalCartPrice = (cart: CartDocument) => {
  const totalPrice = cart.cartItems.reduce((sum, item) => sum + item.quantity * item.price, 0);
  cart.totalCartPrice = Math.round(totalPrice * 100) / 100;
  // any change to the cart removes the applied coupon
  cart.totalPriceAfterDiscount = undefined;
  cart.coupon = undefined;
};

export const toCartResponse = (cart: CartDocument | null, message?: string): CartResponse => ({
  status: 'success',
  ...(message ? { message } : {}),
  numOfCartItems: cart ? cart.cartItems.length : 0,
  data: cart || { cartItems: [], totalCartPrice: 0 },
});

@Injectable()
export class CartService {
  constructor(
    @InjectModel(Cart.name) private readonly cartModel: Model<Cart>,
    @InjectModel(Product.name) private readonly productModel: Model<Product>,
    private readonly couponsService: CouponsService,
  ) {}

  async addProduct(userId: Types.ObjectId, productId: string, color?: string): Promise<CartDocument> {
    const product = await this.productModel.findById(productId);
    if (!product) throw new NotFoundException(`There is no product with id ${productId}`);
    if (product.quantity <= 0) throw new BadRequestException('This product is out of stock');

    let cart = await this.cartModel.findOne({ user: userId });
    const price = unitPrice(product);

    if (!cart) {
      // create cart for logged user with product
      cart = new this.cartModel({ user: userId, cartItems: [{ product: productId, color, price }] });
    } else {
      const productIndex = cart.cartItems.findIndex(
        (item) => item.product.toString() === productId && (item.color || undefined) === (color || undefined),
      );

      if (productIndex > -1) {
        // product exist in cart, update product quantity
        const cartItem = cart.cartItems[productIndex];
        if (cartItem.quantity + 1 > product.quantity) {
          throw new BadRequestException(`Only ${product.quantity} items available in stock`);
        }
        cartItem.quantity += 1;
        cartItem.price = price;
      } else {
        cart.cartItems.push({ product: productId, color, price });
      }
    }

    calcTotalCartPrice(cart);
    await cart.save();
    return cart;
  }

  findByUser(userId: Types.ObjectId) {
    return this.cartModel.findOne({ user: userId });
  }

  async removeItem(userId: Types.ObjectId, itemId: string): Promise<CartDocument | null> {
    const cart = await this.cartModel.findOneAndUpdate(
      { user: userId },
      { $pull: { cartItems: { _id: itemId } } },
      { new: true },
    );
    if (!cart) return null;

    calcTotalCartPrice(cart);
    await cart.save();
    return cart;
  }

  async clear(userId: Types.ObjectId): Promise<void> {
    await this.cartModel.findOneAndDelete({ user: userId });
  }

  async updateItemQuantity(userId: Types.ObjectId, itemId: string, rawQuantity: unknown): Promise<CartDocument> {
    const quantity = Number(rawQuantity);
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new BadRequestException('Quantity must be a whole number greater than 0');
    }

    const cart = await this.cartModel.findOne({ user: userId });
    if (!cart) throw new NotFoundException(`there is no cart for user ${userId.toString()}`);

    const cartItem = cart.cartItems.find((item) => item._id.toString() === itemId);
    if (!cartItem) throw new NotFoundException(`there is no item for this id :${itemId}`);

    const product = await this.productModel.findById(cartItem.product);
    if (product && quantity > product.quantity) {
      throw new BadRequestException(`Only ${product.quantity} items available in stock`);
    }
    cartItem.quantity = quantity;
    if (product) cartItem.price = unitPrice(product);

    calcTotalCartPrice(cart);
    await cart.save();
    return cart;
  }

  async applyCoupon(userId: Types.ObjectId, rawName: unknown): Promise<CartDocument> {
    const name = String(rawName || '').trim();
    const coupon = name ? await this.couponsService.findValidByName(name) : null;
    if (!coupon) throw new BadRequestException('Coupon is invalid or expired');

    const cart = await this.cartModel.findOne({ user: userId });
    if (!cart || cart.cartItems.length === 0) throw new BadRequestException('Your cart is empty');

    const totalPrice = cart.totalCartPrice ?? 0;
    cart.totalPriceAfterDiscount = Math.round((totalPrice - (totalPrice * coupon.discount) / 100) * 100) / 100;
    cart.coupon = coupon.name;
    await cart.save();
    return cart;
  }
}
