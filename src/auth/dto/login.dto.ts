import { IsEmail, IsNotEmpty } from 'class-validator';
import { MinLen } from '../../common/validators/length.validator';

export class LoginDto {
  @IsNotEmpty({ message: 'Email required' })
  @IsEmail({}, { message: 'Invalid email address' })
  email: string;

  @IsNotEmpty({ message: 'Password required' })
  @MinLen(6, { message: 'Password must be at least 6 characters' })
  password: string;
}
