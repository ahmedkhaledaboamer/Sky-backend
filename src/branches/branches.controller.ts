import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import { Auth } from '../auth/decorators/auth.decorator';
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe';
import type { QueryString } from '../common/utils/api-features';
import { toPlain } from '../common/utils/to-plain';
import { BranchesService } from './branches.service';
import { CreateBranchDto, UpdateBranchDto } from './dto/branch.dto';

const BranchId = () => Param('id', new ParseMongoIdPipe('Invalid branch id format'));

@Controller('branches')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Get()
  findAll(@Query() query: QueryString) {
    return this.branchesService.findBranches(query);
  }

  @Post()
  @Auth('admin', 'manager')
  async create(@Body() dto: CreateBranchDto) {
    return { data: await this.branchesService.create(toPlain(dto)) };
  }

  @Get(':id')
  async findOne(@BranchId() id: string) {
    return { data: await this.branchesService.findOne(id) };
  }

  @Put(':id')
  @Auth('admin', 'manager')
  async update(@BranchId() id: string, @Body() dto: UpdateBranchDto) {
    return { data: await this.branchesService.update(id, toPlain(dto)) };
  }

  @Delete(':id')
  @Auth('admin')
  @HttpCode(204)
  async remove(@BranchId() id: string) {
    await this.branchesService.remove(id);
  }
}
