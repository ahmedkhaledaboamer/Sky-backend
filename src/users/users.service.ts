import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcryptjs';
import { Model, Types } from 'mongoose';
import { AuthService } from '../auth/auth.service';
import { ValidationException } from '../common/exceptions/validation.exception';
import { CrudService } from '../common/utils/crud.service';
import { toSlug } from '../common/utils/slug';
import { toPlain } from '../common/utils/to-plain';
import {
  ChangeLoggedUserPasswordDto,
  ChangeUserPasswordDto,
  CreateUserDto,
  UpdateLoggedUserDto,
  UpdateUserDto,
} from './dto/user.dto';
import { User, UserDocument } from './schemas/user.schema';

const pick = (source: object, fields: string[]) => {
  const record = source as Record<string, unknown>;
  return Object.fromEntries(fields.filter((f) => record[f] !== undefined).map((f) => [f, record[f]]));
};

@Injectable()
export class UsersService extends CrudService<User> {
  constructor(
    @InjectModel(User.name) userModel: Model<User>,
    private readonly authService: AuthService,
  ) {
    super(userModel);
  }

  createUser(dto: CreateUserDto): Promise<UserDocument> {
    return this.create({ ...toPlain(dto), slug: toSlug(dto.name) });
  }

  // admin update — only these fields can be changed (never the password)
  async updateUser(id: string, dto: UpdateUserDto): Promise<UserDocument> {
    if (dto.email !== undefined) await this.assertEmailAvailable(dto.email, id);
    if (dto.name !== undefined) dto.slug = toSlug(dto.name);

    const update = pick(dto, ['name', 'slug', 'phone', 'email', 'profileImg', 'role', 'active']);
    const document = await this.model.findByIdAndUpdate(id, update, { new: true });
    if (!document) throw new NotFoundException('no document for this id');
    return document;
  }

  async changeUserPassword(id: string, dto: ChangeUserPasswordDto): Promise<UserDocument> {
    // 1) Verify current password  2) Verify password confirm
    const user = await this.model.findById(id);
    if (!user) throw ValidationException.field('password', 'There is no user for this id', dto.password);
    if (!(await bcrypt.compare(dto.currentPassword, user.password))) {
      throw ValidationException.field('password', 'Incorrect current password', dto.password);
    }
    if (dto.password !== dto.passwordConfirm) {
      throw ValidationException.field('password', 'Password Confirmation incorrect', dto.password);
    }

    const document = await this.setPassword(id, dto.password);
    if (!document) throw new NotFoundException('no document for this id');
    return document;
  }

  async updateLoggedUserPassword(user: UserDocument, dto: ChangeLoggedUserPasswordDto) {
    const updated = await this.setPassword(user._id, dto.password);
    return { data: updated, token: this.authService.createToken(user._id) };
  }

  // without password, role
  async updateLoggedUserData(user: UserDocument, dto: UpdateLoggedUserDto) {
    if (dto.email !== undefined) await this.assertEmailAvailable(dto.email, user._id);
    if (dto.name !== undefined) dto.slug = toSlug(dto.name);
    return this.model.findByIdAndUpdate(user._id, pick(dto, ['name', 'slug', 'email', 'phone']), { new: true });
  }

  async deactivate(user: UserDocument): Promise<void> {
    await this.model.findByIdAndUpdate(user._id, { active: false });
  }

  private async setPassword(id: string | Types.ObjectId, password: string) {
    return this.model.findByIdAndUpdate(
      id,
      { password: await bcrypt.hash(password, 12), passwordChangedAt: Date.now() },
      { new: true },
    );
  }

  // email must be unique — except for the user being updated (ownerId)
  private async assertEmailAvailable(email: string, ownerId?: string | Types.ObjectId) {
    const user = await this.model.findOne({ email: String(email).toLowerCase() });
    if (user && (!ownerId || user._id.toString() !== ownerId.toString())) {
      throw ValidationException.field('email', 'E-mail already in use', email);
    }
  }
}
