import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Capability } from '@guild/shared/enums';
import type {
  AnnouncementResult,
  TeamNoticeReport,
} from '@guild/shared/schemas';

import { CapabilityGuard, JwtAuthGuard, RequireCapability } from '../../common';
import { AnnounceFormationDto } from './dto/announce-formation.dto';
import { NotifyMembersDto } from './dto/notify-members.dto';
import { FormationAnnouncerService } from './formation-announcer.service';
import { TeamNoticeService } from './team-notice.service';

/**
 * The team builder screen's "Gửi Discord" button, and the direct messages that follow it.
 *
 * Route path and Swagger tag say `team-builder` because that is the screen calling it and the
 * resource it names, but the module is this one: everything the request needs — the message
 * wording, the REST client, the channel and role ids — lives here, and nothing in it reads a
 * formation from the database. Routing it through `TeamBuilderModule` instead cost a service method
 * that only forwarded its arguments, and an import edge that closed the cycle
 * `attendance → team-builder → discord-bot → attendance`, which stops Nest at boot.
 *
 * Separate from `DiscordBotController` and `ReminderController` for the reason those two are
 * separate from each other: three different ways of authenticating cannot share a class-level guard.
 * This one is an admin with a JWT, like every other endpoint the web app calls.
 */
@ApiTags('team-builder')
@Controller('team-builder')
@UseGuards(JwtAuthGuard, CapabilityGuard)
@RequireCapability(Capability.TEAM_BUILDER)
export class FormationAnnounceController {
  constructor(
    private readonly announcer: FormationAnnouncerService,
    private readonly notices: TeamNoticeService,
  ) {}

  /**
   * Announce the day's line-up in Discord, with one image per match.
   * @param sessionId - Id of the battle day being announced
   * @param body - images: one `data:image/webp;base64,…` per match, in order
   * @returns How many images reached Discord
   */
  @Post('formations/:sessionId/announce')
  @ApiOperation({ summary: 'Gửi thông báo đội hình của ngày này vào Discord' })
  announceFormation(
    @Param('sessionId') sessionId: string,
    @Body() body: AnnounceFormationDto,
  ): Promise<AnnouncementResult> {
    return this.announcer.announce(sessionId, body.images);
  }

  /**
   * Message each placed member which team they are in, one direct message per match.
   * @param sessionId - Id of the battle day whose line-up is notified
   * @param body - notices: limits the send to those members and matches, for a retry;
   *   teamImages: the card image of each (match, team) that has one
   * @returns How many messages were sent and who did not get one
   */
  @Post('formations/:sessionId/notify-members')
  @ApiOperation({ summary: 'Nhắn riêng từng thành viên đội hình của ngày này' })
  notifyMembers(
    @Param('sessionId') sessionId: string,
    @Body() body: NotifyMembersDto,
  ): Promise<TeamNoticeReport> {
    return this.notices.notifyMembers(sessionId, body.notices, body.teamImages);
  }
}
