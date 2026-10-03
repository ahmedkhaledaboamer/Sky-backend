import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CrudService } from '../common/utils/crud.service';
import { toSlug } from '../common/utils/slug';
import { toPlain } from '../common/utils/to-plain';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { Category } from './schemas/category.schema';

@Injectable()
export class CategoriesService extends CrudService<Category> {
  constructor(@InjectModel(Category.name) categoryModel: Model<Category>) {
    super(categoryModel);
  }

  createCategory(dto: CreateCategoryDto) {
    return this.create({ ...toPlain(dto), slug: toSlug(dto.name) });
  }

  updateCategory(id: string, dto: UpdateCategoryDto) {
    return this.update(id, { ...toPlain(dto), ...(dto.name !== undefined && { slug: toSlug(dto.name) }) });
  }
}
