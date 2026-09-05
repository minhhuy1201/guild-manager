import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { announcementResultSchema } from '@guild/shared/schemas';
import type { AnnouncementResult } from '@guild/shared/schemas';

import { Clock } from '../../common';
import { verifyResponse } from '../../config';
import type { Env } from '../../config';
import { BattleSessionsService } from '../battle-sessions/battle-sessions.public';
import type { OutgoingFile } from './discord-rest';
import { DiscordApiError, DiscordRestClient } from './discord-rest';
import { buildFormationAnnouncement } from './formation-announcement';

/** The only image format the announcement accepts, mirrored by the shared schema. */
const IMAGE_CONTENT_TYPE = 'image/webp';

/** Prefix every incoming image carries, already enforced by `announceFormationSchema`. */
const DATA_URL_PREFIX = `data:${IMAGE_CONTENT_TYPE};base64,`;

/** Shown when the battle the announcement points at no longer exists. */
const SESSION_NOT_FOUND = 'Không tìm thấy trận đánh này.';

/** Status Discord answers with when the bot lacks a permission in the channel. */
const DISCORD_FORBIDDEN = 403;

/**
 * Shown when Discord refuses the post for lack of permission.
 *
 * Names the two permissions and where to set them, because the person reading it is the admin who
 * can grant them — the same reasoning as `/cau-hinh-kenh`'s refusal.
 */
const MISSING_PERMISSIONS =
  'Bot chưa có quyền đăng bài trong channel bang chiến. Vào Discord → Edit Channel → ' +
  'Permissions, bật Send Messages và Attach Files cho bot, rồi gửi lại.';

/**
 * Turn one incoming data URL into the file Discord is handed.
 * @param image - A `data:image/webp;base64,…` string
 * @param index - Zero-based match index, used to name the file
 * @returns The file part
 */
function toFile(image: string, index: number): OutgoingFile {
  return {
    filename: `doi-hinh-${index + 1}.webp`,
    bytes: new Uint8Array(
      Buffer.from(image.slice(DATA_URL_PREFIX.length), 'base64'),
    ),
    contentType: IMAGE_CONTENT_TYPE,
  };
}

/**
 * Posts a day's line-up into the guild's battle channel.
 *
 * Lives in `discord-bot` because everything it touches does — the message shape, the REST client,
 * the channel and role ids. `team-builder` reaches it through `discord-bot.public.ts`, which keeps
 * the dependency one-way: the bot has never needed to know a formation exists.
 */
@Injectable()
export class FormationAnnouncerService {
  constructor(
    private readonly battleSessions: BattleSessionsService,
    private readonly rest: DiscordRestClient,
    private readonly config: ConfigService<Env, true>,
    private readonly clock: Clock,
  ) {}

  /**
   * Announce one battle day's line-up.
   *
   * One message carrying every image, never one per match: a half-sent announcement would leave the
   * channel with a line-up nobody can act on and nothing to clean it up with.
   *
   * @param sessionId - Battle day being announced
   * @param images - Line-up images as `data:image/webp;base64,…`, in match order
   * @returns How many images were sent
   * @throws NotFoundException when the battle day does not exist
   * @throws ForbiddenException when the bot lacks permission to post in the channel
   * @throws DiscordApiError when Discord rejects the message for any other reason
   */
  async announce(
    sessionId: string,
    images: string[],
  ): Promise<AnnouncementResult> {
    const session = await this.battleSessions.findById(sessionId);

    if (!session) throw new NotFoundException(SESSION_NOT_FOUND);

    const payload = buildFormationAnnouncement(
      {
        isGuildWar: session.isGuildWar,
        dateTime: new Date(session.dateTime),
        matchCount: session.matchCount,
        now: this.clock.now(),
      },
      {
        guildRoleId: this.config.get('DISCORD_GUILD_ROLE_ID', { infer: true }),
        baoBanChannelId: this.config.get('DISCORD_BAO_BAN_CHANNEL_ID', {
          infer: true,
        }),
      },
    );

    try {
      await this.rest.postMessageWithFiles(
        this.config.get('DISCORD_BANG_CHIEN_CHANNEL_ID', { infer: true }),
        payload,
        images.map(toFile),
      );
    } catch (error) {
      // Only the permission refusal is translated. Every other status is the system's problem, and
      // rethrowing it untouched keeps Discord's own reason and a stack in the log.
      if (
        error instanceof DiscordApiError &&
        error.status === DISCORD_FORBIDDEN
      ) {
        throw new ForbiddenException(MISSING_PERMISSIONS);
      }

      throw error;
    }

    return verifyResponse(announcementResultSchema, {
      imageCount: images.length,
    } satisfies AnnouncementResult);
  }
}
