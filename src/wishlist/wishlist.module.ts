import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { WishlistController } from './wishlist.controller';
import { WishlistService } from './wishlist.service';

@Module({
  imports: [UsersModule],
  controllers: [WishlistController],
  providers: [WishlistService],
})
export class WishlistModule {}
