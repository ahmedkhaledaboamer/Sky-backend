import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { Branch, BranchSchema } from '../../branches/schemas/branch.schema';
import { Brand, BrandSchema } from '../../brands/schemas/brand.schema';
import { Cart, CartSchema } from '../../cart/schemas/cart.schema';
import { Category, CategorySchema } from '../../categories/schemas/category.schema';
import configuration from '../../config/configuration';
import { Coupon, CouponSchema } from '../../coupons/schemas/coupon.schema';
import { Order, OrderSchema } from '../../orders/schemas/order.schema';
import { Product, ProductSchema } from '../../products/schemas/product.schema';
import { Review, ReviewSchema } from '../../reviews/schemas/review.schema';
import { SubCategory, SubCategorySchema } from '../../subcategories/schemas/subcategory.schema';
import { User, UserSchema } from '../../users/schemas/user.schema';

mongoose.set('strictQuery', true);

// Minimal module for the CLI seed scripts: config + database + every model
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', 'config.env'], load: [configuration] }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({ uri: config.get<string>('db.uri') }),
    }),
    MongooseModule.forFeature([
      { name: Category.name, schema: CategorySchema },
      { name: SubCategory.name, schema: SubCategorySchema },
      { name: Brand.name, schema: BrandSchema },
      { name: Product.name, schema: ProductSchema },
      { name: User.name, schema: UserSchema },
      { name: Review.name, schema: ReviewSchema },
      { name: Coupon.name, schema: CouponSchema },
      { name: Cart.name, schema: CartSchema },
      { name: Order.name, schema: OrderSchema },
      { name: Branch.name, schema: BranchSchema },
    ]),
  ],
})
export class SeedModule {}
