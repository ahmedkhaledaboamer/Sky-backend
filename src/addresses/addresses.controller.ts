import { Body, Controller, Delete, Get, HttpCode, Param, Post } from '@nestjs/common';
import { Auth } from '../auth/decorators/auth.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { UserDocument } from '../users/schemas/user.schema';
import { type AddressBody, AddressesService } from './addresses.service';

@Controller('address')
@Auth('user')
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Post()
  @HttpCode(200)
  async add(@CurrentUser() user: UserDocument, @Body() body: AddressBody) {
    return {
      status: 'success',
      message: 'Address added successfully.',
      data: await this.addressesService.add(user._id, body),
    };
  }

  @Get()
  async findAll(@CurrentUser() user: UserDocument) {
    const addresses = await this.addressesService.findAll(user._id);
    return { status: 'success', results: addresses.length, data: addresses };
  }

  @Delete(':addressId')
  async remove(@CurrentUser() user: UserDocument, @Param('addressId') addressId: string) {
    return {
      status: 'success',
      message: 'Address removed successfully.',
      data: await this.addressesService.remove(user._id, addressId),
    };
  }
}
