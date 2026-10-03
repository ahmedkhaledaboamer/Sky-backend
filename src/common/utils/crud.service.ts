import { NotFoundException } from '@nestjs/common';
import type { FilterQuery, HydratedDocument, Model, PopulateOptions } from 'mongoose';
import { ApiFeatures, Pagination, QueryString, SearchScope } from './api-features';

export interface PaginatedResult<T> {
  results: number;
  pagination: Pagination;
  data: T[];
}

// Port of services/handlersFactory.js — the generic CRUD handlers shared by most resources.
export abstract class CrudService<T> {
  protected constructor(
    protected readonly model: Model<T>,
    private readonly searchScope: SearchScope = 'default',
  ) {}

  async findAll(query: QueryString, filter: FilterQuery<T> = {}): Promise<PaginatedResult<HydratedDocument<T>>> {
    const features = new ApiFeatures<HydratedDocument<T>>(this.model.find(filter), query)
      .filter()
      .search(this.searchScope)
      .sort()
      .limitFields();

    // count with the same filters so numberOfPage / next are correct
    const count = await this.model.countDocuments(features.mongooseQuery.getFilter());
    features.paginate(count);

    const data = await features.mongooseQuery;
    return { results: data.length, pagination: features.pagination, data };
  }

  async findOne(id: string, populate?: string | PopulateOptions): Promise<HydratedDocument<T>> {
    const query = this.model.findById(id);
    if (typeof populate === 'string') query.populate(populate);
    else if (populate) query.populate(populate);
    const document = await query;
    if (!document) throw new NotFoundException('no document for this id');
    return document;
  }

  async create(body: object): Promise<HydratedDocument<T>> {
    return this.model.create(body);
  }

  async update(id: string, body: object): Promise<HydratedDocument<T>> {
    const document = await this.model.findByIdAndUpdate(id, body, { new: true, runValidators: true });
    if (!document) throw new NotFoundException('no document for this id');
    return document;
  }

  async remove(id: string): Promise<void> {
    const document = await this.model.findById(id);
    if (!document) throw new NotFoundException(`no document for this ${id}`);
    // document.deleteOne() triggers 'deleteOne' document middleware (e.g. review ratings)
    await document.deleteOne();
  }
}
