import type { FilterQuery, Query } from 'mongoose';

export type QueryString = Record<string, unknown>;
export type SearchScope = 'products' | 'branches' | 'default';

export interface Pagination {
  currentPage: number;
  limit: number;
  skip: number;
  numberOfPage: number;
  totalResults: number;
  next?: number;
  prev?: number;
}

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Port of utils/apiFeatures.js — filter / search / sort / fields / paginate.
export class ApiFeatures<T> {
  pagination: Pagination;

  constructor(
    public mongooseQuery: Query<T[], T>,
    private readonly queryString: QueryString,
  ) {}

  filter(): this {
    const queryStringObj = { ...this.queryString };
    ['limit', 'page', 'field', 'fields', 'sort', 'keyword'].forEach((field) => delete queryStringObj[field]);

    // { price: { gte: '100' } } => { price: { $gte: '100' } }
    const queryStr = JSON.stringify(queryStringObj).replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);
    this.mongooseQuery = this.mongooseQuery.find(JSON.parse(queryStr) as FilterQuery<T>);
    return this;
  }

  sort(): this {
    const sort = this.queryString.sort;
    if (typeof sort === 'string' && sort) {
      this.mongooseQuery = this.mongooseQuery.sort(`${sort.split(',').join(' ')} _id`);
    } else {
      this.mongooseQuery = this.mongooseQuery.sort('-createdAt _id');
    }
    return this;
  }

  limitFields(): this {
    const fields = this.queryString.field || this.queryString.fields;
    if (typeof fields === 'string' && fields) {
      this.mongooseQuery = this.mongooseQuery.select(fields.split(',').join(' '));
    } else {
      this.mongooseQuery = this.mongooseQuery.select('-__v');
    }
    return this;
  }

  search(scope: SearchScope = 'default'): this {
    if (this.queryString.keyword) {
      const regex = { $regex: escapeRegex(String(this.queryString.keyword)), $options: 'i' };
      let $or: Record<string, unknown>[];
      if (scope === 'products') {
        $or = [{ title: regex }, { titleAr: regex }, { description: regex }];
      } else if (scope === 'branches') {
        $or = [{ name: regex }, { nameAr: regex }, { city: regex }, { cityAr: regex }, { address: regex }];
      } else {
        $or = [{ name: regex }, { nameAr: regex }];
      }
      this.mongooseQuery = this.mongooseQuery.find({ $or } as FilterQuery<T>);
    }
    return this;
  }

  paginate(countDocuments: number): this {
    const page = Math.max(Number(this.queryString.page) * 1 || 1, 1);
    const limit = Math.min(Math.max(Number(this.queryString.limit) * 1 || 50, 1), 500);
    const skip = (page - 1) * limit;
    const endIndex = page * limit;

    const pagination: Pagination = {
      currentPage: page,
      limit,
      skip,
      numberOfPage: Math.ceil(countDocuments / limit),
      totalResults: countDocuments,
    };
    if (endIndex < countDocuments) pagination.next = page + 1;
    if (skip > 0) pagination.prev = page - 1;

    this.mongooseQuery = this.mongooseQuery.skip(skip).limit(limit);
    this.pagination = pagination;
    return this;
  }
}
