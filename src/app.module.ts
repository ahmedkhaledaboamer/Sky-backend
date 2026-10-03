import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { AddressesModule } from './addresses/addresses.module';
import { AuthModule } from './auth/auth.module';
import { BranchesModule } from './branches/branches.module';
import { BrandsModule } from './brands/brands.module';
import { CartModule } from './cart/cart.module';
import { CategoriesModule } from './categories/categories.module';
import { CommonModule } from './common/common.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import configuration from './config/configuration';
import { CouponsModule } from './coupons/coupons.module';
import { OrdersModule } from './orders/orders.module';
import { ProductsModule } from './products/products.module';
import { ReviewsModule } from './reviews/reviews.module';
import { SubCategoriesModule } from './subcategories/subcategories.module';
import { UsersModule } from './users/users.module';
import { WishlistModule } from './wishlist/wishlist.module';

// Mongoose 6 behaviour: unknown query-string filters (?foo=bar) are ignored, not matched
mongoose.set('strictQuery', true);

@Module({
  imports: [
    // `.env` first, `config.env` (the Express app's file) as a fallback
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', 'config.env'], load: [configuration] }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({ uri: config.get<string>('db.uri') }),
    }),
    CommonModule,
    AuthModule,
    UsersModule,
    CategoriesModule,
    SubCategoriesModule,
    BrandsModule,
    ProductsModule,
    ReviewsModule,
    WishlistModule,
    AddressesModule,
    CouponsModule,
    CartModule,
    OrdersModule,
    BranchesModule,
  ],
  providers: [{ provide: APP_FILTER, useClass: AllExceptionsFilter }],
})
export class AppModule {}
