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
   * Start the login flow: send the user to Discord's authorize page.
   * @param redirect - Path to return to after login
   * @returns A redirect instruction for Nest
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
   * Handle Discord's callback and send the user back to the web app.
   * Every failure becomes a redirect carrying an error code — the browser is mid-redirect-chain.
   * @param query - code, state or error as Discord attached them
   * @returns A redirect instruction for Nest
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
   * Trade the one-time code for a JWT pair.
   * @param body - Code taken from the callback page's query string
   * @returns The token pair and session info
   */
  @Post('discord/exchange')
  @ApiOperation({ summary: 'Đổi mã đăng nhập lấy token' })
  exchange(@Body() body: DiscordExchangeDto): Promise<AuthTokens> {
    return this.auth.exchange(body);
  }

  /**
   * Trade a valid refresh token for a new token pair.
   * @param body - The current refresh token
   * @returns The new token pair and session info
   */
  @Post('refresh')
  @ApiOperation({ summary: 'Cấp lại token từ refresh token' })
  refresh(@Body() body: RefreshTokenDto): Promise<AuthTokens> {
    return this.auth.refresh(body);
  }

  /**
   * Session info for the access token in use.
   * @param user - JWT payload attached by JwtAuthGuard
   * @returns Discord ID, role and the character bound to the account
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Thông tin phiên đang đăng nhập' })
  me(@CurrentUser() user: JwtPayload): Promise<SessionUser> {
    return this.auth.me(user);
  }

  /**
   * The old username/password login route.
   * Kept temporarily so a cached old web build does not get a confusing error while the two apps
   * deploy out of step; delete in the next cleanup once both are live.
   * @returns Never returns
   * @throws GoneException always
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
