import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AnnouncementResult } from '@guild/shared/schemas';

import { AdminGuard, JwtAuthGuard } from '../../common';
import { AnnounceFormationDto } from './dto/announce-formation.dto';
import { FormationAnnouncerService } from './formation-announcer.service';

/**
 * The team builder screen's "Gửi Discord" button.
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
@UseGuards(JwtAuthGuard, AdminGuard)
export class FormationAnnounceController {
  constructor(private readonly announcer: FormationAnnouncerService) {}

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
}
