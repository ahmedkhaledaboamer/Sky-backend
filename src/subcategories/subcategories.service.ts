import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CrudService } from '../common/utils/crud.service';
import { toSlug } from '../common/utils/slug';
import { toPlain } from '../common/utils/to-plain';
import { CreateSubCategoryDto, UpdateSubCategoryDto } from './dto/subcategory.dto';
import { SubCategory } from './schemas/subcategory.schema';

@Injectable()
export class SubCategoriesService extends CrudService<SubCategory> {
  constructor(@InjectModel(SubCategory.name) subCategoryModel: Model<SubCategory>) {
    super(subCategoryModel);
  }

  createSubCategory(dto: CreateSubCategoryDto) {
    return this.create({ ...toPlain(dto), slug: toSlug(dto.name) });
  }

  updateSubCategory(id: string, dto: UpdateSubCategoryDto) {
    return this.update(id, { ...toPlain(dto), ...(dto.name !== undefined && { slug: toSlug(dto.name) }) });
  }

  // used by the product validators: every subcategory must exist and belong to the category
  findByIds(ids: string[]) {
    return this.model.find({ _id: { $in: ids } });
  }
}
