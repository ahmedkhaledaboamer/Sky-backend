import { IsEmail, IsIn, IsNotEmpty, IsOptional, ValidateIf } from 'class-validator';
import { MinLen } from '../../common/validators/length.validator';
import { EmailAvailable } from '../../common/validators/database.validators';
import { IsMobilePhoneIn } from '../../common/validators/is-mobile-phone.validator';
import { Match } from '../../common/validators/match.validator';
import { USER_ROLES, UserRole } from '../schemas/user.schema';

const PHONE_LOCALES = ['ar-AE', 'ar-EG', 'ar-SA'] as const;
const PHONE_MESSAGE = 'Invalid phone number only accepted UAE, Egy and SA Phone numbers';

// phone is optional({ checkFalsy: true }) — '' is skipped as well
const hasPhone = (o: { phone?: string }) => Boolean(o.phone);

export class CreateUserDto {
  @IsNotEmpty({ message: 'User required' })
  @MinLen(3, { message: 'Too short User name' })
  name: string;

  @IsNotEmpty({ message: 'Email required' })
  @IsEmail({}, { message: 'Invalid email address' })
  @EmailAvailable({ lowercase: true, message: 'E-mail already in use' })
  email: string;

  @IsNotEmpty({ message: 'Password required' })
  @MinLen(6, { message: 'Password must be at least 6 characters' })
  @Match('passwordConfirm', { message: 'Password Confirmation incorrect' })
  password: string;

  @IsNotEmpty({ message: 'Password confirmation required' })
  passwordConfirm: string;

  @ValidateIf(hasPhone)
  @IsMobilePhoneIn([...PHONE_LOCALES], { message: PHONE_MESSAGE })
  phone?: string;

  @IsOptional()
  profileImg?: string;

  @IsOptional()
  @IsIn(USER_ROLES, { message: 'Invalid role' })
  role?: UserRole;

  slug?: string;
}

export class UpdateUserDto {
  @IsOptional()
  @MinLen(3, { message: 'Too short User name' })
  name?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Invalid email address' })
  email?: string;

  @ValidateIf(hasPhone)
  @IsMobilePhoneIn([...PHONE_LOCALES], { message: PHONE_MESSAGE })
  phone?: string;

  @IsOptional()
  profileImg?: string;

  @IsOptional()
  @IsIn(USER_ROLES, { message: 'Invalid role' })
  role?: UserRole;

  active?: boolean | string;
  slug?: string;
}

export class UpdateLoggedUserDto {
  @IsOptional()
  @MinLen(3, { message: 'Too short User name' })
  name?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Invalid email address' })
  email?: string;

  @ValidateIf(hasPhone)
  @IsMobilePhoneIn([...PHONE_LOCALES], { message: PHONE_MESSAGE })
  phone?: string;

  slug?: string;
}

export class ChangeUserPasswordDto {
  @IsNotEmpty({ message: 'You must enter your current password' })
  currentPassword: string;

  @IsNotEmpty({ message: 'You must enter the password confirm' })
  passwordConfirm: string;

  @IsNotEmpty({ message: 'You must enter new password' })
  @MinLen(6, { message: 'Password must be at least 6 characters' })
  password: string;
}

export class ChangeLoggedUserPasswordDto {
  @IsNotEmpty({ message: 'You must enter new password' })
  @MinLen(6, { message: 'Password must be at least 6 characters' })
  password: string;
}
