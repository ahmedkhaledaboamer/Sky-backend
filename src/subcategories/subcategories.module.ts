import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SubCategory, SubCategorySchema } from './schemas/subcategory.schema';
import { SubCategoriesController } from './subcategories.controller';
import { SubCategoriesService } from './subcategories.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: SubCategory.name, schema: SubCategorySchema }])],
  controllers: [SubCategoriesController],
  providers: [SubCategoriesService],
  exports: [SubCategoriesService],
})
export class SubCategoriesModule {}
