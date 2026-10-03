import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Auth } from '../auth/decorators/auth.decorator';
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe';
import { ResizeImageInterceptor } from '../common/uploads/resize-image.interceptor';
import { imageUploadOptions } from '../common/uploads/upload-options';
import type { QueryString } from '../common/utils/api-features';
import { BrandsService } from './brands.service';
import { CreateBrandDto, UpdateBrandDto } from './dto/brand.dto';

// image is optional — the current one is kept when no file is sent
const UploadBrandImage = () =>
  UseInterceptors(
    FileInterceptor('image', imageUploadOptions),
    ResizeImageInterceptor({ field: 'image', folder: 'brands', keepCurrentWhenMissing: true }),
  );

@Controller('brands')
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Get()
  findAll(@Query() query: QueryString) {
    return this.brandsService.findAll(query);
  }

  @Post()
  @Auth('admin', 'manager')
  @UploadBrandImage()
  async create(@Body() dto: CreateBrandDto) {
    return { data: await this.brandsService.createBrand(dto) };
  }

  @Get(':id')
  async findOne(@Param('id', new ParseMongoIdPipe('invalied Brand id')) id: string) {
    return { data: await this.brandsService.findOne(id) };
  }

  @Put(':id')
  @Auth('admin', 'manager')
  @UploadBrandImage()
  async update(@Param('id', new ParseMongoIdPipe('Invalid brand id format')) id: string, @Body() dto: UpdateBrandDto) {
    return { data: await this.brandsService.updateBrand(id, dto) };
  }

  @Delete(':id')
  @Auth('admin')
  @HttpCode(204)
  async remove(@Param('id', new ParseMongoIdPipe('Invalid brand id format')) id: string) {
    await this.brandsService.remove(id);
  }
}
