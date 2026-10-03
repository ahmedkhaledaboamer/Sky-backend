import { Body, Controller, HttpCode, Post, Put } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordBody, ResetPasswordBody, VerifyResetCodeBody } from './dto/password-reset.dto';
import { SignupDto } from './dto/signup.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // 201 { data, token }
  @Post('signup')
  signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }

  // 200 { data, token }
  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('forgotPassword')
  @HttpCode(200)
  forgotPassword(@Body() body: ForgotPasswordBody) {
    return this.authService.forgotPassword(body);
  }

  @Post('verifyResetCode')
  @HttpCode(200)
  verifyResetCode(@Body() body: VerifyResetCodeBody) {
    return this.authService.verifyResetCode(body);
  }

  @Put('resetPassword')
  resetPassword(@Body() body: ResetPasswordBody) {
    return this.authService.resetPassword(body);
  }
}
