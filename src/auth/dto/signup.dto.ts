import { IsEmail, IsNotEmpty } from 'class-validator';
import { EmailAvailable } from '../../common/validators/database.validators';
import { MinLen } from '../../common/validators/length.validator';
import { Match } from '../../common/validators/match.validator';

export class SignupDto {
  @IsNotEmpty({ message: 'User required' })
  @MinLen(3, { message: 'Too short User name' })
  name: string;

  @IsNotEmpty({ message: 'Email required' })
  @IsEmail({}, { message: 'Invalid email address' })
  @EmailAvailable({ lowercase: false, message: 'E-mail already in user' })
  email: string;

  @IsNotEmpty({ message: 'Password required' })
  @MinLen(6, { message: 'Password must be at least 6 characters' })
  @Match('passwordConfirm', { message: 'Password Confirmation incorrect' })
  password: string;

  @IsNotEmpty({ message: 'Password confirmation required' })
  passwordConfirm: string;
}
