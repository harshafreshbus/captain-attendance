import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { LoginDto } from './dto/login.dto';

@Controller()
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('/admin/auth/sendotp')
  @UsePipes(new ValidationPipe({ transform: true }))
  async sendOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendOtp(dto);
  }

  @Post('/admin/auth/verifyotp')
  @UsePipes(new ValidationPipe({ transform: true }))
  async verifyOtp(@Body() dto: VerifyOtpDto, @Res() res: Response) {
    const result = await this.authService.verifyOtp(dto, res);
    return res.json(result);
  }

  @Post('/admin/auth/resendotp')
  @UsePipes(new ValidationPipe({ transform: true }))
  async resendOtp(@Body() dto: SendOtpDto) {
    return this.authService.resendOtp(dto);
  }

  @Post('/auth/login')
  @UsePipes(new ValidationPipe({ transform: true }))
  async login(@Body() dto: LoginDto, @Res() res: Response) {
    const result = await this.authService.login(dto, res);
    return res.json(result);
  }

  @Get('/auth/refresh-token')
  async refresh(@Req() req: Request, @Res() res: Response) {
    const result = await this.authService.refreshToken(req, res);
    return res.json(result);
  }

  @Get('/auth/logout')
  async logout(@Req() req: Request, @Res() res: Response) {
    await this.authService.logout(req, res);
    return res.json({ status: true });
  }
}
