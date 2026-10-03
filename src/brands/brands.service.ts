import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CrudService } from '../common/utils/crud.service';
import { toSlug } from '../common/utils/slug';
import { toPlain } from '../common/utils/to-plain';
import { CreateBrandDto, UpdateBrandDto } from './dto/brand.dto';
import { Brand } from './schemas/brand.schema';

@Injectable()
export class BrandsService extends CrudService<Brand> {
  constructor(@InjectModel(Brand.name) brandModel: Model<Brand>) {
    super(brandModel);
  }

  createBrand(dto: CreateBrandDto) {
    return this.create({ ...toPlain(dto), slug: toSlug(dto.name) });
  }

  updateBrand(id: string, dto: UpdateBrandDto) {
    return this.update(id, { ...toPlain(dto), ...(dto.name !== undefined && { slug: toSlug(dto.name) }) });
  }
}
