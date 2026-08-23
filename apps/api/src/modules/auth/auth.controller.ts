import {
  Body,
  Controller,
  Get,
  GoneException,
  Post,
  Query,
  Redirect,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthTokens, SessionUser } from '@guild/shared/schemas';

import { CurrentUser, JwtAuthGuard, type JwtPayload } from '../../common';
import { AuthService } from './auth.service';
import { DiscordExchangeDto } from './dto/discord-exchange.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /**
   * Mở luồng đăng nhập: đưa người dùng sang trang cho phép của Discord.
   * @param redirect - Đường dẫn muốn quay lại sau khi đăng nhập
   * @returns Chỉ dẫn redirect cho Nest
   */
  @Get('discord')
  @Redirect()
  @ApiOperation({ summary: 'Mở đăng nhập bằng Discord' })
  async discord(
    @Query('redirect') redirect?: string,
  ): Promise<{ url: string }> {
    return { url: await this.auth.authorizeUrl(redirect) };
  }

  /**
   * Nhận callback của Discord rồi đẩy người dùng về web.
   * Mọi lỗi đều thành một redirect kèm mã lỗi — trình duyệt đang giữa chuỗi redirect.
   * @param query - code, state hoặc error do Discord gắn vào
   * @returns Chỉ dẫn redirect cho Nest
   */
  @Get('discord/callback')
  @Redirect()
  @ApiOperation({ summary: 'Callback OAuth2 của Discord' })
  async discordCallback(
    @Query() query: { code?: string; state?: string; error?: string },
  ): Promise<{ url: string }> {
    return { url: await this.auth.handleCallback(query) };
  }

  /**
   * Đổi mã dùng-một-lần lấy cặp JWT.
   * @param body - Mã lấy từ query string của trang callback
   * @returns Cặp token và thông tin phiên
   */
  @Post('discord/exchange')
  @ApiOperation({ summary: 'Đổi mã đăng nhập lấy token' })
  exchange(@Body() body: DiscordExchangeDto): Promise<AuthTokens> {
    return this.auth.exchange(body);
  }

  /**
   * Đổi refresh token còn hạn thành cặp token mới.
   * @param body - Refresh token hiện tại
   * @returns Cặp token mới và thông tin phiên
   */
  @Post('refresh')
  @ApiOperation({ summary: 'Cấp lại token từ refresh token' })
  refresh(@Body() body: RefreshTokenDto): Promise<AuthTokens> {
    return this.auth.refresh(body);
  }

  /**
   * Thông tin phiên của access token đang dùng.
   * @param user - Payload JWT do JwtAuthGuard gắn vào request
   * @returns Discord ID, vai và nhân vật gắn với tài khoản
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Thông tin phiên đang đăng nhập' })
  me(@CurrentUser() user: JwtPayload): Promise<SessionUser> {
    return this.auth.me(user);
  }

  /**
   * Đường đăng nhập cũ bằng tên đăng nhập/mật khẩu.
   * Giữ tạm để bản web cũ còn cache không nhận về một lỗi khó hiểu trong lúc hai app deploy lệch
   * nhau; xoá ở lần dọn sau khi cả hai đã lên.
   * @returns Không bao giờ trả về
   * @throws GoneException luôn luôn
   */
  @Post('login')
  @ApiOperation({
    summary: 'Đã ngừng — đăng nhập nay dùng Discord',
    deprecated: true,
  })
  login(): never {
    throw new GoneException(
      'Cách đăng nhập đã thay đổi, vui lòng tải lại trang.',
    );
  }
}
