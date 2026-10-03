import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from '../users/schemas/user.schema';

export interface AddressBody {
  alias?: string;
  details?: string;
  phone?: string;
  city?: string;
  postalCode?: string;
}

@Injectable()
export class AddressesService {
  constructor(@InjectModel(User.name) private readonly userModel: Model<User>) {}

  // $addToSet => add address object to user addresses array if address not exist
  async add(userId: Types.ObjectId, address: AddressBody) {
    const user = await this.userModel.findByIdAndUpdate(userId, { $addToSet: { addresses: address } }, { new: true });
    return user?.addresses ?? [];
  }

  // $pull => remove address object from user addresses array if addressId exist
  async remove(userId: Types.ObjectId, addressId: string) {
    const user = await this.userModel.findByIdAndUpdate(
      userId,
      { $pull: { addresses: { _id: addressId } } },
      { new: true },
    );
    return user?.addresses ?? [];
  }

  async findAll(userId: Types.ObjectId) {
    const user = await this.userModel.findById(userId);
    return user?.addresses ?? [];
  }
}
