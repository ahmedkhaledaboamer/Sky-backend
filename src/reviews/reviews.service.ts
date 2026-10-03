import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ValidationException } from '../common/exceptions/validation.exception';
import { CrudService } from '../common/utils/crud.service';
import { toPlain } from '../common/utils/to-plain';
import type { UserDocument } from '../users/schemas/user.schema';
import { CreateReviewDto, UpdateReviewBody } from './dto/review.dto';
import { Review, ReviewModel } from './schemas/review.schema';

@Injectable()
export class ReviewsService extends CrudService<Review> {
  constructor(@InjectModel(Review.name) reviewModel: ReviewModel) {
    super(reviewModel);
  }

  async createReview(dto: CreateReviewDto, user: UserDocument) {
    // Check if logged user create review before
    if (await this.model.findOne({ user: user._id, product: dto.product })) {
      throw ValidationException.field('product', 'You already created a review before', dto.product);
    }
    return this.create(toPlain(dto));
  }

  async updateReview(id: string, body: UpdateReviewBody, user: UserDocument) {
    await this.assertOwner(id, user);
    return this.update(id, body);
  }

  async removeReview(id: string, user: UserDocument) {
    if (user.role === 'user') await this.assertOwner(id, user);
    await this.remove(id);
  }

  // Check review ownership before update / delete (reported like a validation error)
  private async assertOwner(id: string, user: UserDocument) {
    const review = await this.model.findById(id);
    if (!review) {
      throw ValidationException.field('id', `There is no review with id ${id}`, id, 'params');
    }
    // user is populated by the review pre-find hook
    const ownerId = (review.user as unknown as { _id: { toString(): string } })._id.toString();
    if (ownerId !== user._id.toString()) {
      throw ValidationException.field('id', 'Your are not allowed to perform this action', id, 'params');
    }
  }
}
