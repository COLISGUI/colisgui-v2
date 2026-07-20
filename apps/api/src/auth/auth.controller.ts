import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request, Response, CookieOptions } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

const REFRESH_COOKIE = 'cg_refresh';

function refreshCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/api/v1/auth',
    maxAge: 7 * 24 * 3600 * 1000, // 7 jours
  };
}

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Public() @Throttle({ default: { ttl: 60000, limit: 8 } })
  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { refreshToken, ...rest } = await this.auth.login(dto);
    res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions());
    return rest; // le refresh token n'est PAS renvoyé dans le corps
  }

  @Public() @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    // Le refresh token provient du cookie httpOnly (inaccessible au JS client).
    const token = (req as any).cookies?.[REFRESH_COOKIE];
    const { refreshToken, ...rest } = await this.auth.refresh(token);
    res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions());
    return rest;
  }

  @Public() @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('forgot-password')
  forgot(@Body() dto: ForgotPasswordDto) { return this.auth.forgotPassword(dto.identifiant); }

  @Public() @Post('reset-password')
  reset(@Body() dto: ResetPasswordDto) { return this.auth.resetPassword(dto.token, dto.nouveauMotDePasse); }

  @Post('logout')
  async logout(@CurrentUser('id') userId: string, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.logout(userId);
    res.clearCookie(REFRESH_COOKIE, { path: '/api/v1/auth' });
    return result;
  }

  @Post('change-password')
  changePassword(@CurrentUser('id') userId: string, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(userId, dto);
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) { return user; }
}
