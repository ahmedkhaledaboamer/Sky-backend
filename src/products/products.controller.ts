import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query, UseInterceptors } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { Auth } from '../auth/decorators/auth.decorator';
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe';
import { imageUploadOptions } from '../common/uploads/upload-options';
import type { QueryString } from '../common/utils/api-features';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { ProductImagesInterceptor } from './interceptors/product-images.interceptor';
import { ProductsService } from './products.service';

const ProductId = () => Param('id', new ParseMongoIdPipe('Invalid ID formate'));
const UploadProductImages = () =>
  UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'imageCover', maxCount: 1 },
        { name: 'images', maxCount: 5 },
      ],
      imageUploadOptions,
    ),
    ProductImagesInterceptor,
  );

// Reviews of a product (/products/:productId/reviews) live in ReviewsController.
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(@Query() query: QueryString) {
    return this.productsService.findAll(query);
  }

  @Post()
  @Auth('admin', 'manager')
  @UploadProductImages()
  async create(@Body() dto: CreateProductDto) {
    return { data: await this.productsService.createProduct(dto) };
  }

  @Get(':id')
  async findOne(@ProductId() id: string) {
    return { data: await this.productsService.findOne(id, 'reviews') };
  }

  @Put(':id')
  @Auth('admin', 'manager')
  @UploadProductImages()
  async update(@ProductId() id: string, @Body() dto: UpdateProductDto) {
    return { data: await this.productsService.updateProduct(id, dto) };
  }

  @Delete(':id')
  @Auth('admin')
  @HttpCode(204)
  async remove(@ProductId() id: string) {
    await this.productsService.remove(id);
  }
}
