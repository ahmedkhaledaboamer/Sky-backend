import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import Stripe from 'stripe';
import { Cart, CartDocument } from '../cart/schemas/cart.schema';
import { CrudService } from '../common/utils/crud.service';
import { Product } from '../products/schemas/product.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Order, OrderDocument, ShippingAddress } from './schemas/order.schema';

@Injectable()
export class OrdersService extends CrudService<Order> {
  private readonly taxPrice: number;
  private readonly shippingPrice: number;

  constructor(
    @InjectModel(Order.name) orderModel: Model<Order>,
    @InjectModel(Cart.name) private readonly cartModel: Model<Cart>,
    @InjectModel(Product.name) private readonly productModel: Model<Product>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly config: ConfigService,
  ) {
    super(orderModel);
    this.taxPrice = this.config.get<number>('shop.taxPrice') ?? 0;
    this.shippingPrice = this.config.get<number>('shop.shippingPrice') ?? 0;
  }

  private stripe(): Stripe {
    const secret = this.config.get<string>('stripe.secret');
    if (!secret) throw new BadRequestException('Card payments are not configured');
    // stripe@13 => API version 2023-08-16, same as the Express app
    return new Stripe(secret, {} as Stripe.StripeConfig);
  }

  async createCashOrder(user: UserDocument, cartId: string, shippingAddress?: ShippingAddress) {
    if (!shippingAddress || !shippingAddress.details || !shippingAddress.phone || !shippingAddress.city) {
      throw new BadRequestException('Shipping address (details, phone, city) is required');
    }

    // 1) Get cart depend on cartId
    const cart = await this.getOrderableCart(user, cartId);
    // 2) Get order price depend on cart price "Check if coupon apply"
    const totalOrderPrice = this.cartPrice(cart) + this.taxPrice + this.shippingPrice;

    // 3) Create order with default paymentMethodType cash
    const order = await this.model.create({
      user: user._id,
      cartItems: cart.cartItems,
      shippingAddress,
      taxPrice: this.taxPrice,
      shippingPrice: this.shippingPrice,
      totalOrderPrice,
    });

    // 4) decrement product quantity, increment product sold  5) Clear cart
    await this.updateStockAndClearCart(cart);
    return order;
  }

  // users only see their own orders
  findAllFor(user: UserDocument, query: Record<string, unknown>) {
    const filter: FilterQuery<Order> = user.role === 'user' ? { user: user._id } : {};
    return this.findAll(query, filter);
  }

  async findOneFor(user: UserDocument, id: string): Promise<OrderDocument> {
    const order = await this.model.findById(id);
    // user is populated by the order pre-find hook
    const owner = order?.user as unknown as { _id?: Types.ObjectId } | undefined;
    const ownerId = (owner?._id ?? owner)?.toString();
    if (!order || (user.role === 'user' && ownerId !== user._id.toString())) {
      throw new NotFoundException(`There is no such a order with this id:${id}`);
    }
    return order;
  }

  markPaid(id: string) {
    return this.setOrderFlag(id, 'isPaid', 'paidAt');
  }

  markDelivered(id: string) {
    return this.setOrderFlag(id, 'isDelivered', 'deliveredAt');
  }

  async checkoutSession(
    user: UserDocument,
    cartId: string,
    shippingAddress: ShippingAddress = {},
    requestOrigin: string,
  ) {
    const cart = await this.getOrderableCart(user, cartId);
    const totalOrderPrice = this.cartPrice(cart) + this.taxPrice + this.shippingPrice;
    const frontendUrl = this.config.get<string>('shop.frontendUrl') || requestOrigin;

    return this.stripe().checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: this.config.get<string>('shop.currency') ?? 'aed',
            unit_amount: Math.round(totalOrderPrice * 100),
            product_data: { name: `Royal Care order - ${user.name}` },
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${frontendUrl}/account/orders?payment=success`,
      cancel_url: `${frontendUrl}/cart?payment=cancelled`,
      customer_email: user.email,
      client_reference_id: cartId,
      metadata: {
        details: String(shippingAddress.details || ''),
        phone: String(shippingAddress.phone || ''),
        city: String(shippingAddress.city || ''),
        postalCode: String(shippingAddress.postalCode || ''),
      },
    });
  }

  // Verifies the Stripe signature; throws with the Stripe / config error message
  constructWebhookEvent(rawBody: Buffer | undefined, signature: string | undefined): Stripe.Event {
    return this.stripe().webhooks.constructEvent(
      rawBody ?? '',
      signature ?? '',
      this.config.get<string>('stripe.webhookSecret') ?? '',
    );
  }

  async createCardOrder(session: Stripe.Checkout.Session): Promise<void> {
    const cart = await this.cartModel.findById(session.client_reference_id);
    const user = await this.userModel.findOne({ email: session.customer_email });
    if (!cart || !user) return;

    await this.model.create({
      user: user._id,
      cartItems: cart.cartItems,
      shippingAddress: session.metadata,
      taxPrice: this.taxPrice,
      shippingPrice: this.shippingPrice,
      totalOrderPrice: (session.amount_total ?? 0) / 100,
      isPaid: true,
      paidAt: Date.now(),
      paymentMethodType: 'card',
    });

    await this.updateStockAndClearCart(cart);
  }

  // Loads the logged user's cart and makes sure it can be ordered
  private async getOrderableCart(user: UserDocument, cartId: string): Promise<CartDocument> {
    const cart = await this.cartModel.findById(cartId);
    if (!cart || cart.user.toString() !== user._id.toString()) {
      throw new NotFoundException(`There is no such cart with id ${cartId}`);
    }
    if (cart.cartItems.length === 0) {
      throw new BadRequestException('Your cart is empty');
    }

    // stock check
    const products = await this.productModel
      .find({ _id: { $in: cart.cartItems.map((i) => i.product) } })
      .select('title quantity');
    const missing = cart.cartItems.find((item) => {
      const product = products.find((p) => p._id.toString() === item.product.toString());
      return !product || product.quantity < item.quantity;
    });
    if (missing) {
      throw new BadRequestException('Some items in your cart are no longer available in this quantity');
    }
    return cart;
  }

  private cartPrice(cart: CartDocument): number {
    return Number(cart.totalPriceAfterDiscount != null ? cart.totalPriceAfterDiscount : cart.totalCartPrice) || 0;
  }

  private async updateStockAndClearCart(cart: CartDocument): Promise<void> {
    await this.productModel.bulkWrite(
      cart.cartItems.map((item) => ({
        updateOne: {
          filter: { _id: item.product },
          update: { $inc: { quantity: -item.quantity, sold: +item.quantity } },
        },
      })),
      {},
    );
    await this.cartModel.findByIdAndDelete(cart._id);
  }

  private async setOrderFlag(id: string, flag: 'isPaid' | 'isDelivered', dateField: 'paidAt' | 'deliveredAt') {
    const order = await this.model.findById(id);
    if (!order) throw new NotFoundException(`There is no such a order with this id:${id}`);
    order[flag] = true;
    order[dateField] = new Date();
    return order.save();
  }
}
