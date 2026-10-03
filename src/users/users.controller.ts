import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe';
import { ResizeImageInterceptor } from '../common/uploads/resize-image.interceptor';
import { imageUploadOptions } from '../common/uploads/upload-options';
import type { QueryString } from '../common/utils/api-features';
import {
  ChangeLoggedUserPasswordDto,
  ChangeUserPasswordDto,
  CreateUserDto,
  UpdateLoggedUserDto,
  UpdateUserDto,
} from './dto/user.dto';
import type { UserDocument } from './schemas/user.schema';
import { UsersService } from './users.service';

const UserId = () => Param('id', new ParseMongoIdPipe('Invalid User id format'));
const UploadProfileImage = () =>
  UseInterceptors(
    FileInterceptor('profileImg', imageUploadOptions),
    ResizeImageInterceptor({ field: 'profileImg', folder: 'users' }),
  );

// Every route needs a token; the admin section needs admin/manager.
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ----- logged user -----
  @Get('getMe')
  async getMe(@CurrentUser() user: UserDocument) {
    return { data: await this.usersService.findOne(user._id.toString()) };
  }

  @Put('changeMyPassword')
  changeMyPassword(@CurrentUser() user: UserDocument, @Body() dto: ChangeLoggedUserPasswordDto) {
    return this.usersService.updateLoggedUserPassword(user, dto);
  }

  @Put('updateMe')
  async updateMe(@CurrentUser() user: UserDocument, @Body() dto: UpdateLoggedUserDto) {
    return { data: await this.usersService.updateLoggedUserData(user, dto) };
  }

  @Delete('deleteMe')
  @HttpCode(204)
  async deleteMe(@CurrentUser() user: UserDocument) {
    await this.usersService.deactivate(user);
  }

  // ----- admin -----
  @Get()
  @Roles('admin', 'manager')
  findAll(@Query() query: QueryString) {
    return this.usersService.findAll(query);
  }

  @Post()
  @Roles('admin', 'manager')
  @UploadProfileImage()
  async create(@Body() dto: CreateUserDto) {
    return { data: await this.usersService.createUser(dto) };
  }

  @Get(':id')
  @Roles('admin', 'manager')
  async findOne(@UserId() id: string) {
    return { data: await this.usersService.findOne(id) };
  }

  @Put(':id')
  @Roles('admin', 'manager')
  @UploadProfileImage()
  async update(@UserId() id: string, @Body() dto: UpdateUserDto) {
    return { data: await this.usersService.updateUser(id, dto) };
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(204)
  async remove(@UserId() id: string) {
    await this.usersService.remove(id);
  }

  @Put('changeMyPassword/:id')
  @Roles('admin', 'manager')
  async changePassword(@UserId() id: string, @Body() dto: ChangeUserPasswordDto) {
    return { data: await this.usersService.changeUserPassword(id, dto) };
  }
}
