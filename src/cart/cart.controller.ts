import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put } from '@nestjs/common';
import { Auth } from '../auth/decorators/auth.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { UserDocument } from '../users/schemas/user.schema';
import { CartService, toCartResponse } from './cart.service';

// Bodies were never validated by express-validator; the service checks them itself.
interface AddToCartBody {
  productId: string;
  color?: string;
}

@Controller('cart')
@Auth('user')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Post()
  @HttpCode(200)
  async add(@CurrentUser() user: UserDocument, @Body() body: AddToCartBody) {
    const cart = await this.cartService.addProduct(user._id, body.productId, body.color);
    return toCartResponse(cart, 'Product added to cart successfully');
  }

  // an empty cart when the user has none
  @Get()
  async findMine(@CurrentUser() user: UserDocument) {
    return toCartResponse(await this.cartService.findByUser(user._id));
  }

  @Delete()
  @HttpCode(204)
  async clear(@CurrentUser() user: UserDocument) {
    await this.cartService.clear(user._id);
  }

  @Put('applyCoupon')
  async applyCoupon(@CurrentUser() user: UserDocument, @Body() body: { coupon?: string }) {
    return toCartResponse(await this.cartService.applyCoupon(user._id, body.coupon));
  }

  @Put(':itemId')
  async updateQuantity(
    @CurrentUser() user: UserDocument,
    @Param('itemId') itemId: string,
    @Body() body: { quantity?: number | string },
  ) {
    return toCartResponse(await this.cartService.updateItemQuantity(user._id, itemId, body.quantity));
  }

  @Delete(':itemId')
  async removeItem(@CurrentUser() user: UserDocument, @Param('itemId') itemId: string) {
    return toCartResponse(await this.cartService.removeItem(user._id, itemId));
  }
}
