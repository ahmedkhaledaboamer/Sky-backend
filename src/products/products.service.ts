import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ValidationException } from '../common/exceptions/validation.exception';
import { CrudService } from '../common/utils/crud.service';
import { toSlug } from '../common/utils/slug';
import { toPlain } from '../common/utils/to-plain';
import { SubCategoriesService } from '../subcategories/subcategories.service';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { Product } from './schemas/product.schema';

@Injectable()
export class ProductsService extends CrudService<Product> {
  constructor(
    @InjectModel(Product.name) productModel: Model<Product>,
    private readonly subCategoriesService: SubCategoriesService,
  ) {
    super(productModel, 'products');
  }

  async createProduct(dto: CreateProductDto) {
    await this.assertSubcategoriesValid(dto.subcategories, dto.category);
    return this.create({ ...toPlain(dto), slug: toSlug(dto.title) });
  }

  async updateProduct(id: string, dto: UpdateProductDto) {
    await this.assertSubcategoriesValid(dto.subcategories, dto.category, id);
    return this.update(id, { ...toPlain(dto), ...(dto.title !== undefined && { slug: toSlug(dto.title) }) });
  }

  // every subcategory must exist and belong to the product category
  private async assertSubcategoriesValid(ids: string[] | undefined, categoryId?: string, productId?: string) {
    if (!ids || ids.length === 0) return;

    let category: string | Types.ObjectId | undefined = categoryId;
    if (!category && productId) {
      const product = await this.model.findById(productId).select('category');
      // category is populated by the product pre-find hook
      category = (product?.category as unknown as { _id?: Types.ObjectId } | undefined)?._id;
    }

    const subs = await this.subCategoriesService.findByIds(ids);
    if (subs.length !== ids.length) {
      throw ValidationException.field('subcategories', 'Invalid subcategories Ids', ids);
    }
    if (category && subs.some((s) => s.category.toString() !== category.toString())) {
      throw ValidationException.field('subcategories', 'subcategories not belong to category', ids);
    }
  }
}
