import { Body, Controller, Delete, Get, HttpCode, Param, Post } from '@nestjs/common';
import { Auth } from '../auth/decorators/auth.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { UserDocument } from '../users/schemas/user.schema';
import { WishlistService } from './wishlist.service';

interface AddToWishlistBody {
  productId?: string;
}

@Controller('wishlist')
@Auth('user')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Post()
  @HttpCode(200)
  async add(@CurrentUser() user: UserDocument, @Body() body: AddToWishlistBody) {
    return {
      status: 'success',
      message: 'Product added successfully to your wishlist.',
      data: await this.wishlistService.add(user._id, body.productId),
    };
  }

  @Get()
  async findAll(@CurrentUser() user: UserDocument) {
    const wishlist = await this.wishlistService.findAll(user._id);
    return { status: 'success', results: wishlist.length, data: wishlist };
  }

  @Delete(':productId')
  async remove(@CurrentUser() user: UserDocument, @Param('productId') productId: string) {
    return {
      status: 'success',
      message: 'Product removed successfully from your wishlist.',
      data: await this.wishlistService.remove(user._id, productId),
    };
  }
}
