import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser, JwtAuthGuard, type JwtPayload } from '@/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import type { AuthTokensEntity, AuthUserEntity } from './entities/auth.entity';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /**
   * Đăng nhập bằng tài khoản quản trị.
   * @param body - Tên đăng nhập và mật khẩu
   * @returns Access token (hạn 1 ngày), refresh token (hạn 1 tuần) và thông tin tài khoản
   */
  @Post('login')
  @ApiOperation({ summary: 'Đăng nhập bằng tài khoản quản trị' })
  login(@Body() body: LoginDto): Promise<AuthTokensEntity> {
    return this.auth.login(body);
  }

  /**
   * Đổi refresh token còn hạn thành cặp token mới.
   * @param body - Refresh token hiện tại
   * @returns Cặp token mới và thông tin tài khoản
   */
  @Post('refresh')
  @ApiOperation({ summary: 'Cấp lại token từ refresh token' })
  refresh(@Body() body: RefreshTokenDto): Promise<AuthTokensEntity> {
    return this.auth.refresh(body);
  }

  /**
   * Thông tin tài khoản của access token đang dùng.
   * @param user - Payload JWT do JwtAuthGuard gắn vào request
   * @returns Tên đăng nhập và quyền
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Thông tin tài khoản đang đăng nhập' })
  me(@CurrentUser() user: JwtPayload): AuthUserEntity {
    return { username: user.sub, role: user.role };
  }
}
