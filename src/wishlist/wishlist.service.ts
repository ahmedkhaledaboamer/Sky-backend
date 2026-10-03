import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from '../users/schemas/user.schema';

@Injectable()
export class WishlistService {
  constructor(@InjectModel(User.name) private readonly userModel: Model<User>) {}

  // $addToSet => add productId to wishlist array if productId not exist
  async add(userId: Types.ObjectId, productId: unknown) {
    const user = await this.userModel.findByIdAndUpdate(userId, { $addToSet: { wishlist: productId } }, { new: true });
    return user?.wishlist ?? [];
  }

  // $pull => remove productId from wishlist array if productId exist
  async remove(userId: Types.ObjectId, productId: string) {
    const user = await this.userModel.findByIdAndUpdate(userId, { $pull: { wishlist: productId } }, { new: true });
    return user?.wishlist ?? [];
  }

  async findAll(userId: Types.ObjectId) {
    const user = await this.userModel.findById(userId).populate('wishlist');
    return user?.wishlist ?? [];
  }
}
