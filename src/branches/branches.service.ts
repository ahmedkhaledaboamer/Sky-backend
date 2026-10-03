import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { QueryString } from '../common/utils/api-features';
import { CrudService } from '../common/utils/crud.service';
import { Branch } from './schemas/branch.schema';

@Injectable()
export class BranchesService extends CrudService<Branch> {
  constructor(@InjectModel(Branch.name) branchModel: Model<Branch>) {
    super(branchModel, 'branches');
  }

  // Public list only shows active branches; staff (?all=true) see every branch
  findBranches({ all, ...query }: QueryString) {
    return this.findAll(query, all === 'true' ? {} : { active: true });
  }
}
