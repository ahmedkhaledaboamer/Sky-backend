import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query, UseInterceptors } from '@nestjs/common';
import { Auth } from '../auth/decorators/auth.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { BodyDefaultsInterceptor } from '../common/interceptors/body-defaults.interceptor';
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe';
import type { QueryString } from '../common/utils/api-features';
import type { UserDocument } from '../users/schemas/user.schema';
import { CreateReviewDto, type UpdateReviewBody } from './dto/review.dto';
import { ReviewsService } from './reviews.service';

const ReviewId = () => Param('id', new ParseMongoIdPipe('Invalid Review id format'));

// Mounted twice, like the Express nested router:
//   /api/v1/reviews/...
//   /api/v1/products/:productId/reviews/...
@Controller(['reviews', 'products/:productId/reviews'])
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  findAll(@Query() query: QueryString, @Param('productId') productId?: string) {
    return this.reviewsService.findAll(query, productId ? { product: productId } : {});
  }

  @Post()
  @Auth('user')
  @UseInterceptors(
    BodyDefaultsInterceptor((req) => ({ product: req.params.productId, user: req.user?._id.toString() })),
  )
  async create(@Body() dto: CreateReviewDto, @CurrentUser() user: UserDocument) {
    return { data: await this.reviewsService.createReview(dto, user) };
  }

  @Get(':id')
  async findOne(@ReviewId() id: string) {
    return { data: await this.reviewsService.findOne(id) };
  }

  @Put(':id')
  @Auth('user')
  async update(@ReviewId() id: string, @Body() body: UpdateReviewBody, @CurrentUser() user: UserDocument) {
    return { data: await this.reviewsService.updateReview(id, body, user) };
  }

  @Delete(':id')
  @Auth('user', 'manager', 'admin')
  @HttpCode(204)
  async remove(@ReviewId() id: string, @CurrentUser() user: UserDocument) {
    await this.reviewsService.removeReview(id, user);
  }
}
