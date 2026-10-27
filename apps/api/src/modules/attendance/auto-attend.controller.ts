import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AutoAttendStatus } from '@guild/shared/schemas';

import { CurrentUser, JwtAuthGuard, type RequestActor } from '../../common';
import { SetAutoAttendDto } from './dto/set-auto-attend.dto';
import { AutoAttendService } from './auto-attend.service';

/** Auto-attend of the signed-in member's own character; nobody switches it for somebody else. */
@ApiTags('auto-attend')
@ApiBearerAuth()
@Controller('auto-attend')
@UseGuards(JwtAuthGuard)
export class AutoAttendController {
  constructor(private readonly autoAttend: AutoAttendService) {}

  /**
   * Where the caller's Auto-attend stands.
   * @param user - JWT payload attached by JwtAuthGuard
   * @returns Whether it is on, and since when
   */
  @Get('me')
  @ApiOperation({ summary: 'Trạng thái tự động điểm danh của tôi' })
  status(@CurrentUser() user: RequestActor): Promise<AutoAttendStatus> {
    return this.autoAttend.status(user);
  }

  /**
   * Turn the caller's Auto-attend on or off.
   * @param body - The state to end up in
   * @param user - JWT payload attached by JwtAuthGuard
   * @returns The status after the change
   */
  @Put('me')
  @ApiOperation({ summary: 'Bật hoặc tắt tự động điểm danh của tôi' })
  set(
    @Body() body: SetAutoAttendDto,
    @CurrentUser() user: RequestActor,
  ): Promise<AutoAttendStatus> {
    return this.autoAttend.set(user, body.enabled);
  }
}
