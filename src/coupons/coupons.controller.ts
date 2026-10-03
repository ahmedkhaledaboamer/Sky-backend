import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import { Auth } from '../auth/decorators/auth.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe';
import type { QueryString } from '../common/utils/api-features';
import { toPlain } from '../common/utils/to-plain';
import { CouponsService } from './coupons.service';
import { CreateCouponDto, UpdateCouponDto } from './dto/coupon.dto';

const CouponId = () => Param('id', new ParseMongoIdPipe('Invalid coupon id format'));

@Controller('coupon')
@Auth('admin', 'manager')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Get()
  findAll(@Query() query: QueryString) {
    return this.couponsService.findAll(query);
  }

  @Post()
  async create(@Body() dto: CreateCouponDto) {
    return { data: await this.couponsService.create(toPlain(dto)) };
  }

  @Get(':id')
  async findOne(@CouponId() id: string) {
    return { data: await this.couponsService.findOne(id) };
  }

  @Put(':id')
  async update(@CouponId() id: string, @Body() dto: UpdateCouponDto) {
    return { data: await this.couponsService.update(id, toPlain(dto)) };
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(204)
  async remove(@CouponId() id: string) {
    await this.couponsService.remove(id);
  }
}
