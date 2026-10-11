import {
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import { CatRaceService } from '../cat-race/cat-race.public';
import { BotChannelService } from './bot-channel.service';
import { buildCatRaceAnnouncement } from './cat-race-announcement';
import { DiscordRestClient, isDiscordForbidden } from './discord-rest';

/** Shown when no `GENERAL_NOTI` channel is configured yet. */
const NO_CHANNEL =
  'Chưa đặt kênh thông báo chung. Chạy /cau-hinh-kenh muc-dich:Thông báo chung ' +
  'trong kênh muốn nhận rồi thử lại.';

/** Shown when Discord refuses the post for lack of permission. */
const MISSING_PERMISSIONS =
  'Bot chưa có quyền đăng bài trong channel thông báo chung. Vào Discord → Edit Channel → ' +
  'Permissions, bật Send Messages cho bot, rồi gửi lại.';

/**
 * Posts an ended cat race's summary to the general notice channel.
 *
 * `discordPostedAt` is written only after Discord accepted the message, so a refused post can be
 * retried and an accepted one cannot be repeated.
 */
@Injectable()
export class CatRaceAnnouncerService {
  constructor(
    private readonly catRace: CatRaceService,
    private readonly channels: BotChannelService,
    private readonly rest: DiscordRestClient,
  ) {}

  /**
   * Post the summary of one event.
   * @param eventId - Ended event to announce
   * @throws ConflictException when the event is open, already posted, or no channel is configured
   * @throws ForbiddenException when the bot may not post in the channel
   * @throws DiscordApiError when Discord rejects the message for any other reason
   */
  async announce(eventId: string): Promise<void> {
    const announcement = await this.catRace.announcement(eventId);
    const channelId = await this.channels.get('GENERAL_NOTI');
    if (!channelId) throw new ConflictException(NO_CHANNEL);

    try {
      await this.rest.postMessage(
        channelId,
        buildCatRaceAnnouncement(announcement),
      );
    } catch (error) {
      if (isDiscordForbidden(error)) {
        throw new ForbiddenException(MISSING_PERMISSIONS);
      }

      throw error;
    }

    await this.catRace.markAnnounced(eventId);
  }
}
