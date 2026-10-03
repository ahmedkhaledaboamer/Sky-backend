import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CrudService } from '../common/utils/crud.service';
import { Coupon } from './schemas/coupon.schema';

@Injectable()
export class CouponsService extends CrudService<Coupon> {
  constructor(@InjectModel(Coupon.name) couponModel: Model<Coupon>) {
    super(couponModel);
  }

  // valid (not expired) coupon by name, case-insensitive
  findValidByName(name: string) {
    return this.model.findOne({
      name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
      expire: { $gt: Date.now() },
    });
  }
}
