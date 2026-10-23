import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { assertNever } from '@guild/shared/lib';
import { teamNoticeReportSchema } from '@guild/shared/schemas';
import type {
  NotifyMembersInput,
  TeamNoticeReport,
  TeamNoticeTarget,
} from '@guild/shared/schemas';

import { Clock } from '../../common';
import { verifyResponse } from '../../config';
import type { Env } from '../../config';
import { AttendanceService } from '../attendance/attendance.public';
import { BattleSessionsService } from '../battle-sessions/battle-sessions.public';
import { CharactersService } from '../characters/characters.public';
import { TeamBuilderService } from '../team-builder/team-builder.public';
import type { MessagePayload } from './commands/command.types';
import { DISCORD_ERROR_CODE } from './discord.constants';
import {
  DISCORD_RATE_LIMITED,
  DiscordApiError,
  DiscordRestClient,
} from './discord-rest';
import type { OutgoingFile } from './discord-rest';
import { buildTeamNotice } from './team-notice';
import { isWanted, placementsOf } from './team-notice-plan';
import type { MemberRow } from './team-notice-plan';
import { webpFileFromDataUrl } from './webp-file';

/** Shown when the battle the notices point at no longer exists. */
const SESSION_NOT_FOUND = 'Không tìm thấy trận đánh này.';

/** Shown when notices are requested before the line-up was announced. */
const NOT_ANNOUNCED_YET =
  'Ngày này chưa đóng điểm danh. Hãy gửi thông báo đội hình vào Discord trước khi nhắn riêng từng người.';

/** Longest a 429 may ask us to wait before we give up on that member instead. */
const MAX_RETRY_WAIT_SECONDS = 10;

/** How long to wait after a 429 that did not say. */
const DEFAULT_RETRY_WAIT_SECONDS = 1;

/**
 * How long a send may run before it stops starting new deliveries. A Vercel Function is killed at
 * 300 seconds, and a kill mid-run loses the report and invites a duplicate send on retry; stopping
 * here leaves time to answer, and the rest is reported as unsent.
 */
const NOTIFY_BUDGET_MS = 220_000;

/** Milliseconds in a second, for turning Discord's `retry_after` into a timer. */
const SECOND_MS = 1000;

/**
 * Key of one (match, team) pair in the image lookup.
 * @param matchIndex - Stored match number, 1 or 2
 * @param team - Team number
 * @returns A string unique to the pair
 */
function pairKey(matchIndex: number, team: number): string {
  return `${matchIndex}:${team}`;
}

/** How one member's delivery ended. */
type DeliveryResult = 'sent' | 'blocked' | 'unsent' | 'too-fast';

/**
 * Sends each placed member a direct message saying which team they are in.
 *
 * Lives in `discord-bot` beside the formation announcement it follows: the wording, the REST client
 * and the times it quotes are all this module's. It reads the formation, attendance and roster
 * through their modules' public services and writes nothing.
 */
@Injectable()
export class TeamNoticeService {
  private readonly logger = new Logger(TeamNoticeService.name);

  constructor(
    private readonly battleSessions: BattleSessionsService,
    private readonly teamBuilder: TeamBuilderService,
    private readonly attendance: AttendanceService,
    private readonly characters: CharactersService,
    private readonly rest: DiscordRestClient,
    private readonly config: ConfigService<Env, true>,
    private readonly clock: Clock,
  ) {}

  /**
   * Send the Team notices of one battle day, one member at a time.
   *
   * Reads the saved formation, not anything the browser sends: the notice must match what the
   * announcement showed the guild, and the browser could hold a draft that was never saved.
   *
   * @param sessionId - Battle day whose line-up is notified
   * @param only - Narrow the send to these members and matches (a retry); omitted means everyone.
   *   A pair the formation does not hold is ignored, and the rest of the rules still apply to it.
   * @param teamImages - Card image of each (match, team) that has one. A team without one gets the
   *   text notice; an image for a pair nobody is notified in is never sent.
   * @param note - Announcement note shown under every notice's headline; omitted when there is none
   * @returns Who was messaged and, for everyone else, why not
   * @throws NotFoundException when the battle day does not exist
   * @throws BadRequestException when the day's attendance is still open (nothing announced yet)
   */
  async notifyMembers(
    sessionId: string,
    only?: NotifyMembersInput['notices'],
    teamImages: NotifyMembersInput['teamImages'] = [],
    note?: string,
  ): Promise<TeamNoticeReport> {
    const session = await this.battleSessions.findById(sessionId);

    if (!session) throw new NotFoundException(SESSION_NOT_FOUND);
    if (!session.isAttendanceClosed) {
      throw new BadRequestException(NOT_ANNOUNCED_YET);
    }

    const [saved, records, rows] = await Promise.all([
      this.teamBuilder.getSavedFormation(sessionId),
      this.attendance.getRecordsForSessions([sessionId]),
      this.characters.listRows(),
    ]);
    const members = new Map<string, MemberRow>(
      rows.map((row) => [row.id, row]),
    );
    const presentIds = new Set(
      records
        .filter((record) => record.isPresent)
        .map((record) => record.characterId),
    );

    const bangChienChannelId = this.config.get(
      'DISCORD_BANG_CHIEN_CHANNEL_ID',
      {
        infer: true,
      },
    );

    const imageFiles = new Map<string, OutgoingFile>(
      teamImages.map(({ matchIndex, team, image }) => [
        pairKey(matchIndex, team),
        webpFileFromDataUrl(image, `team-${team}-tran-${matchIndex}.webp`),
      ]),
    );

    const sent: TeamNoticeTarget[] = [];
    const blocked: TeamNoticeTarget[] = [];
    const notPresent: TeamNoticeTarget[] = [];
    const missingDiscordId: TeamNoticeTarget[] = [];
    const unsent: TeamNoticeTarget[] = [];
    // Set once Discord says we are opening DMs too fast (going on risks the bot being blocked from
    // opening any) or the time budget is spent: everything still waiting is reported as unsent.
    let stopped = false;
    const startedAt = this.clock.now().getTime();

    for (const placement of placementsOf(saved.matches, members).filter(
      (candidate) => isWanted(candidate, only),
    )) {
      const { member } = placement;
      const target: TeamNoticeTarget = {
        characterId: member.id,
        name: member.name,
        matchIndex: placement.matchIndex,
      };

      if (!presentIds.has(member.id)) {
        notPresent.push(target);
      } else if (member.discordId === null) {
        missingDiscordId.push(target);
      } else if (stopped || this.isOutOfTime(startedAt)) {
        if (!stopped) {
          this.logger.warn(
            'Hết thời gian nhắn riêng, phần còn lại được báo là chưa nhắn.',
          );
        }

        stopped = true;
        unsent.push(target);
      } else {
        const file = imageFiles.get(
          pairKey(placement.matchIndex, placement.team),
        );
        const result = await this.deliver(
          member.discordId,
          buildTeamNotice({
            isGuildWar: session.isGuildWar,
            dateTime: new Date(session.dateTime),
            matchIndex: placement.matchIndex,
            matchCount: session.matchCount,
            team: placement.team,
            teamName: saved.teamNames[String(placement.team)] ?? null,
            hasImage: file !== undefined,
            bangChienChannelId,
            note: note ?? null,
          }),
          file ? [file] : [],
        );

        switch (result) {
          case 'sent':
            sent.push(target);
            break;
          case 'blocked':
            blocked.push(target);
            break;
          case 'too-fast':
            stopped = true;
            unsent.push(target);
            break;
          case 'unsent':
            unsent.push(target);
            break;
          default:
            assertNever(result);
        }
      }
    }

    return verifyResponse(teamNoticeReportSchema, {
      sentCount: sent.length,
      totalCount:
        sent.length +
        blocked.length +
        missingDiscordId.length +
        notPresent.length +
        unsent.length,
      blocked,
      missingDiscordId,
      notPresent,
      unsent,
    } satisfies TeamNoticeReport);
  }

  /**
   * Whether the send has used up its time budget.
   * @param startedAt - When the send began, in epoch milliseconds
   * @returns true once no new delivery should start
   */
  private isOutOfTime(startedAt: number): boolean {
    return this.clock.now().getTime() - startedAt > NOTIFY_BUDGET_MS;
  }

  /**
   * Open the member's DM and post their notice into it, sorting a refusal into what it means.
   *
   * A 429 is waited out and tried once more; a second one is given up on. Every other failure is
   * logged with Discord's own body, because the report only says "unsent".
   *
   * @param discordId - Discord user id of the recipient
   * @param payload - The notice
   * @param files - The team card to attach, empty for a text-only notice
   * @param canRetry - Whether a 429 may still be waited out
   * @returns How the delivery ended
   */
  private async deliver(
    discordId: string,
    payload: MessagePayload,
    files: OutgoingFile[],
    canRetry = true,
  ): Promise<DeliveryResult> {
    try {
      const dmChannelId = await this.rest.openDm(discordId);

      if (files.length > 0) {
        await this.rest.postMessageWithFiles(dmChannelId, payload, files);
      } else {
        await this.rest.postMessage(dmChannelId, payload);
      }

      return 'sent';
    } catch (error) {
      if (error instanceof DiscordApiError) {
        if (error.code === DISCORD_ERROR_CODE.cannotMessageUser) {
          return 'blocked';
        }

        if (error.code === DISCORD_ERROR_CODE.openingDmsTooFast) {
          this.logger.warn(
            `Discord báo mở DM quá nhanh (${error.code}), dừng nhắn riêng: ${error.message}`,
          );

          return 'too-fast';
        }

        const wait = error.retryAfter ?? DEFAULT_RETRY_WAIT_SECONDS;

        if (
          canRetry &&
          error.status === DISCORD_RATE_LIMITED &&
          wait <= MAX_RETRY_WAIT_SECONDS
        ) {
          await new Promise((resolve) => setTimeout(resolve, wait * SECOND_MS));

          return this.deliver(discordId, payload, files, false);
        }
      }

      this.logger.warn(
        `Không nhắn riêng được cho ${discordId}: ${error instanceof Error ? error.message : String(error)}`,
      );

      return 'unsent';
    }
  }
}
