import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Auth } from '../auth/decorators/auth.decorator';
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe';
import { ResizeImageInterceptor } from '../common/uploads/resize-image.interceptor';
import { imageUploadOptions } from '../common/uploads/upload-options';
import type { QueryString } from '../common/utils/api-features';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

// image is optional on update — the current one is kept when no file is sent
const UploadCategoryImage = () =>
  UseInterceptors(
    FileInterceptor('image', imageUploadOptions),
    ResizeImageInterceptor({ field: 'image', folder: 'categories', keepCurrentWhenMissing: true }),
  );

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  findAll(@Query() query: QueryString) {
    return this.categoriesService.findAll(query);
  }

  @Post()
  @Auth('admin', 'manager')
  @UploadCategoryImage()
  async create(@Body() dto: CreateCategoryDto) {
    return { data: await this.categoriesService.createCategory(dto) };
  }

  @Get(':id')
  async findOne(@Param('id', new ParseMongoIdPipe('invalied category id')) id: string) {
    return { data: await this.categoriesService.findOne(id) };
  }

  @Put(':id')
  @Auth('admin', 'manager')
  @UploadCategoryImage()
  async update(
    @Param('id', new ParseMongoIdPipe('Invalid category id format')) id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return { data: await this.categoriesService.updateCategory(id, dto) };
  }

  @Delete(':id')
  @Auth('admin')
  @HttpCode(204)
  async remove(@Param('id', new ParseMongoIdPipe('Invalid category id format')) id: string) {
    await this.categoriesService.remove(id);
  }
}
