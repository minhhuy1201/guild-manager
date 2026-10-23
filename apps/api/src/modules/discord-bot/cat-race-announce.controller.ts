import {
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Capability } from '@guild/shared/enums';
import type { CatRaceEventDetail } from '@guild/shared/schemas';

import { CapabilityGuard, JwtAuthGuard, RequireCapability } from '../../common';
import { CatRaceService } from '../cat-race/cat-race.public';
import { CatRaceAnnouncerService } from './cat-race-announcer.service';

/**
 * The cat race screen's "Đăng tổng kết lên Discord" button. Lives here, not in `cat-race`, because
 * the message, the REST client and the channel are this module's - the same split as
 * `FormationAnnounceController`.
 */
@ApiTags('cat-races')
@ApiBearerAuth()
@Controller('cat-races')
@UseGuards(JwtAuthGuard, CapabilityGuard)
@RequireCapability(Capability.CAT_RACE)
export class CatRaceAnnounceController {
  constructor(
    private readonly announcer: CatRaceAnnouncerService,
    private readonly catRace: CatRaceService,
  ) {}

  /**
   * Post an ended event's summary to Discord.
   * @param id - Event id
   * @returns The event, now carrying `discordPostedAt`
   */
  @Post(':id/announce')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng tổng kết đợt đua lên Discord' })
  async announce(@Param('id') id: string): Promise<CatRaceEventDetail> {
    await this.announcer.announce(id);

    return this.catRace.detail(id);
  }
}
