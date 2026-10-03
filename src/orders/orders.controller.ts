import { Body, Controller, Get, HttpCode, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { QueryString } from '../common/utils/api-features';
import type { UserDocument } from '../users/schemas/user.schema';
import { OrdersService } from './orders.service';
import type { ShippingAddress } from './schemas/order.schema';

interface OrderBody {
  shippingAddress?: ShippingAddress;
}

@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // GET kept for older clients; POST is preferred (sends the shipping address)
  @Get('checkout-session/:cartId')
  @Roles('user')
  checkoutSessionGet(@CurrentUser() user: UserDocument, @Param('cartId') cartId: string, @Req() req: Request) {
    return this.checkout(user, cartId, {}, req);
  }

  @Post('checkout-session/:cartId')
  @Roles('user')
  @HttpCode(200)
  checkoutSessionPost(
    @CurrentUser() user: UserDocument,
    @Param('cartId') cartId: string,
    @Body() body: OrderBody,
    @Req() req: Request,
  ) {
    return this.checkout(user, cartId, body, req);
  }

  @Post(':cartId')
  @Roles('user')
  async createCashOrder(@CurrentUser() user: UserDocument, @Param('cartId') cartId: string, @Body() body: OrderBody) {
    return { status: 'success', data: await this.ordersService.createCashOrder(user, cartId, body.shippingAddress) };
  }

  @Get()
  @Roles('user', 'admin', 'manager')
  findAll(@CurrentUser() user: UserDocument, @Query() query: QueryString) {
    return this.ordersService.findAllFor(user, query);
  }

  @Get(':id')
  @Roles('user', 'admin', 'manager')
  async findOne(@CurrentUser() user: UserDocument, @Param('id') id: string) {
    return { data: await this.ordersService.findOneFor(user, id) };
  }

  @Put(':id/pay')
  @Roles('admin', 'manager')
  async pay(@Param('id') id: string) {
    return { status: 'success', data: await this.ordersService.markPaid(id) };
  }

  @Put(':id/deliver')
  @Roles('admin', 'manager')
  async deliver(@Param('id') id: string) {
    return { status: 'success', data: await this.ordersService.markDelivered(id) };
  }

  private async checkout(user: UserDocument, cartId: string, body: OrderBody | undefined, req: Request) {
    const origin = `${req.protocol}://${req.get('host')}`;
    const session = await this.ordersService.checkoutSession(user, cartId, body?.shippingAddress, origin);
    return { status: 'success', session };
  }
}
