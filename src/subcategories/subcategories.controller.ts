import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query, UseInterceptors } from '@nestjs/common';
import { Auth } from '../auth/decorators/auth.decorator';
import { BodyDefaultsInterceptor } from '../common/interceptors/body-defaults.interceptor';
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe';
import type { QueryString } from '../common/utils/api-features';
import { CreateSubCategoryDto, UpdateSubCategoryDto } from './dto/subcategory.dto';
import { SubCategoriesService } from './subcategories.service';

// Mounted twice, like the Express nested router:
//   /api/v1/subcategories/...
//   /api/v1/categories/:categoryId/subcategory/...
@Controller(['subcategories', 'categories/:categoryId/subcategory'])
export class SubCategoriesController {
  constructor(private readonly subCategoriesService: SubCategoriesService) {}

  @Post()
  @Auth('admin', 'manager')
  @UseInterceptors(BodyDefaultsInterceptor((req) => ({ category: req.params.categoryId })))
  async create(@Body() dto: CreateSubCategoryDto) {
    return { data: await this.subCategoriesService.createSubCategory(dto) };
  }

  @Get()
  findAll(@Query() query: QueryString, @Param('categoryId') categoryId?: string) {
    return this.subCategoriesService.findAll(query, categoryId ? { category: categoryId } : {});
  }

  @Get(':id')
  async findOne(@Param('id', new ParseMongoIdPipe('invalied SubCategory id')) id: string) {
    return { data: await this.subCategoriesService.findOne(id) };
  }

  @Put(':id')
  @Auth('admin', 'manager')
  async update(
    @Param('id', new ParseMongoIdPipe('Invalid SubCategory id format')) id: string,
    @Body() dto: UpdateSubCategoryDto,
  ) {
    return { data: await this.subCategoriesService.updateSubCategory(id, dto) };
  }

  @Delete(':id')
  @Auth('admin')
  @HttpCode(204)
  async remove(@Param('id', new ParseMongoIdPipe('Invalid SubCategory id format')) id: string) {
    await this.subCategoriesService.remove(id);
  }
}
