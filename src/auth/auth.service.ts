import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcryptjs';
import { createHash } from 'crypto';
import { Model, Types } from 'mongoose';
import { MailService } from '../mail/mail.service';
import { User, UserDocument } from '../users/schemas/user.schema';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordBody, ResetPasswordBody, VerifyResetCodeBody } from './dto/password-reset.dto';
import { SignupDto } from './dto/signup.dto';

export interface JwtPayload {
  userId: string;
  iat: number;
}

export interface AuthResult {
  data: UserDocument;
  token: string;
}

const hashResetCode = (code: string) => createHash('sha256').update(code).digest('hex');

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  // utils/createToken.js — payload { userId }
  createToken(userId: Types.ObjectId | string): string {
    return this.jwtService.sign({ userId: String(userId) });
  }

  async signup(dto: SignupDto): Promise<AuthResult> {
    const user = await this.userModel.create({ name: dto.name, email: dto.email, password: dto.password });
    return { data: user, token: this.createToken(user._id) };
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.userModel.findOne({ email: String(dto.email).toLowerCase() });
    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Incorrect email or password');
    }
    // reactivate an account that was deactivated with DELETE /users/deleteMe
    if (!user.active) {
      user.active = true;
      await user.save();
    }
    return { data: user, token: this.createToken(user._id) };
  }

  // Port of `protect`: verifies the bearer token and returns the current user.
  // jsonwebtoken errors (invalid / expired) are mapped to 401 by the exception filter.
  async authenticate(authorization?: string): Promise<UserDocument> {
    let token: string | undefined;
    if (authorization && authorization.startsWith('Bearer')) {
      token = authorization.split(' ')[1];
    }
    if (!token) {
      throw new UnauthorizedException('You are not login, Please login to get access this route');
    }

    const decoded = this.jwtService.verify<JwtPayload>(token);
    const currentUser = await this.userModel.findById(decoded.userId);
    if (!currentUser) {
      throw new UnauthorizedException('the user that belong to this token does no longer exist');
    }

    // Password changed after token created
    if (currentUser.passwordChangedAt) {
      const passChangedTimestamp = Math.floor(currentUser.passwordChangedAt.getTime() / 1000);
      if (passChangedTimestamp > decoded.iat) {
        throw new UnauthorizedException('User recently changed his password. please login again..');
      }
    }

    if (!currentUser.active) {
      throw new UnauthorizedException('This account is deactivated, please login again to activate it');
    }
    return currentUser;
  }

  async forgotPassword(body: ForgotPasswordBody): Promise<{ status: string; message: string }> {
    const user = await this.userModel.findOne({ email: String(body.email || '').toLowerCase() });
    if (!user) {
      throw new NotFoundException(`There is no user with that email ${body.email}`);
    }

    // random 6 digits, stored hashed, valid for 10 min
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    user.passwordResetCode = hashResetCode(resetCode);
    user.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000);
    user.passwordResetVerified = false;
    await user.save();

    const message = `Hi ${user.name},\n We received a request to reset the password on your E-shop Account. \n ${resetCode} \n Enter this code to complete the reset. \n Thanks for helping us keep your account secure.\n The E-shop Team`;
    try {
      await this.mailService.send({ email: user.email, subject: 'Reset password', message });
    } catch {
      user.passwordResetCode = undefined;
      user.passwordResetExpires = undefined;
      user.passwordResetVerified = undefined;
      await user.save();
      throw new InternalServerErrorException('There is an error in sending email');
    }

    return { status: 'Success', message: 'Reset code sent to email' };
  }

  async verifyResetCode(body: VerifyResetCodeBody): Promise<{ status: string }> {
    const user = await this.userModel.findOne({
      passwordResetCode: hashResetCode(String(body.resetCode || '')),
      passwordResetExpires: { $gt: Date.now() },
    });
    if (!user) {
      throw new BadRequestException('Reset code invalid or expired');
    }
    user.passwordResetVerified = true;
    await user.save();
    return { status: 'Success' };
  }

  async resetPassword(body: ResetPasswordBody): Promise<{ token: string }> {
    const user = await this.userModel.findOne({ email: String(body.email || '').toLowerCase() });
    if (!user) {
      throw new NotFoundException(`There is no user with email ${body.email}`);
    }
    if (!user.passwordResetVerified) {
      throw new BadRequestException('Reset code not verified');
    }

    user.password = body.newPassword as string;
    user.passwordResetCode = undefined;
    user.passwordResetExpires = undefined;
    user.passwordResetVerified = undefined;
    await user.save();

    return { token: this.createToken(user._id) };
  }
}
