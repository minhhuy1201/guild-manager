import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  SLOTS_PER_TEAM,
  assertNever,
  buildSlotId,
  parseSlotId,
} from '@guild/shared/lib';
import { teamNoticeReportSchema } from '@guild/shared/schemas';
import type {
  MatchFormation,
  NotifyMembersInput,
  TeamNoticeReport,
  TeamNoticeTarget,
} from '@guild/shared/schemas';

import { verifyResponse } from '../../config';
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
import { buildTeamNotice } from './team-notice';
import type { TeamNoticeSlot } from './team-notice';

/** Shown when the battle the notices point at no longer exists. */
const SESSION_NOT_FOUND = 'Không tìm thấy trận đánh này.';

/** Shown when notices are requested before the line-up was announced. */
const NOT_ANNOUNCED_YET =
  'Ngày này chưa đóng điểm danh. Hãy gửi thông báo đội hình vào Discord trước khi nhắn riêng từng người.';

/** Longest a 429 may ask us to wait before we give up on that member instead. */
const MAX_RETRY_WAIT_SECONDS = 10;

/** How long to wait after a 429 that did not say. */
const DEFAULT_RETRY_WAIT_SECONDS = 1;

/** Milliseconds in a second, for turning Discord's `retry_after` into a timer. */
const SECOND_MS = 1000;

/** How one member's delivery ended. */
type DeliveryResult = 'sent' | 'blocked' | 'unsent' | 'too-fast';

/** The columns of a guild member this service reads. */
interface MemberRow {
  id: string;
  name: string;
  discordId: string | null;
}

/** A member the formation places, and where. */
interface Placement {
  member: MemberRow;
  /** Stored match number, 1 or 2 */
  matchIndex: number;
  team: number;
  position: number;
}

/**
 * Every placement of a formation, in the order notices are sent: match, then team, then position.
 *
 * A member who stands in two cells of one match gets one notice for it, from the first cell.
 *
 * @param matches - The day's saved matches, match 1 first
 * @param members - Guild members by id; a placed id missing from it is dropped
 * @returns One placement per member per match
 */
function placementsOf(
  matches: MatchFormation[],
  members: Map<string, MemberRow>,
): Placement[] {
  return matches.flatMap((match, index) => {
    const seen = new Set<string>();
    const placements: Placement[] = [];

    for (const [slotId, characterId] of Object.entries(match.slots)) {
      const coordinates = parseSlotId(slotId);
      const member = members.get(characterId);

      // A member deleted between reading the formation and reading the roster has nobody left to
      // message. An unreadable slot id is a row from outside the grid; neither can be notified.
      if (!coordinates || !member) continue;

      placements.push({ member, matchIndex: index + 1, ...coordinates });
    }

    return placements
      .sort((a, b) => a.team - b.team || a.position - b.position)
      .filter((placement) => {
        if (seen.has(placement.member.id)) return false;

        seen.add(placement.member.id);

        return true;
      });
  });
}

/**
 * Whether a placement is one the caller asked to be notified.
 * @param placement - A member in a match
 * @param only - The requested pairs, undefined for no restriction
 * @returns true when there is no restriction or the pair is listed
 */
function isWanted(
  placement: Placement,
  only: NotifyMembersInput['notices'],
): boolean {
  if (only === undefined) return true;

  return only.some(
    (notice) =>
      notice.characterId === placement.member.id &&
      notice.matchIndex === placement.matchIndex,
  );
}

/**
 * Every position of one team in one match, with names resolved.
 * @param match - The match's saved formation
 * @param team - Team number
 * @param members - Guild members by id
 * @returns Exactly `SLOTS_PER_TEAM` slots in position order
 */
function slotsOfTeam(
  match: MatchFormation,
  team: number,
  members: Map<string, MemberRow>,
): TeamNoticeSlot[] {
  return Array.from({ length: SLOTS_PER_TEAM }, (_, index) => {
    const slotId = buildSlotId(team, index + 1);
    const characterId = match.slots[slotId] ?? null;

    return {
      characterId,
      name: characterId ? (members.get(characterId)?.name ?? null) : null,
      note: match.notes[slotId] ?? null,
    };
  });
}

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
   * @returns Who was messaged and, for everyone else, why not
   * @throws NotFoundException when the battle day does not exist
   * @throws BadRequestException when the day's attendance is still open (nothing announced yet)
   */
  async notifyMembers(
    sessionId: string,
    only?: NotifyMembersInput['notices'],
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

    const sent: TeamNoticeTarget[] = [];
    const blocked: TeamNoticeTarget[] = [];
    const notPresent: TeamNoticeTarget[] = [];
    const missingDiscordId: TeamNoticeTarget[] = [];
    const unsent: TeamNoticeTarget[] = [];
    // Once Discord says we are opening DMs too fast, going on risks the bot being blocked from
    // opening any: everything still waiting is reported as unsent instead.
    let stopped = false;

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
      } else if (stopped) {
        unsent.push(target);
      } else {
        const result = await this.deliver(
          member.discordId,
          buildTeamNotice({
            isGuildWar: session.isGuildWar,
            dateTime: new Date(session.dateTime),
            matchIndex: placement.matchIndex,
            matchCount: session.matchCount,
            team: placement.team,
            teamName: saved.teamNames[String(placement.team)] ?? null,
            recipientId: member.id,
            slots: slotsOfTeam(
              saved.matches[placement.matchIndex - 1],
              placement.team,
              members,
            ),
          }),
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
   * Open the member's DM and post their notice into it, sorting a refusal into what it means.
   *
   * A 429 is waited out and tried once more; a second one is given up on. Every other failure is
   * logged with Discord's own body, because the report only says "unsent".
   *
   * @param discordId - Discord user id of the recipient
   * @param payload - The notice
   * @param canRetry - Whether a 429 may still be waited out
   * @returns How the delivery ended
   */
  private async deliver(
    discordId: string,
    payload: MessagePayload,
    canRetry = true,
  ): Promise<DeliveryResult> {
    try {
      const dmChannelId = await this.rest.openDm(discordId);

      await this.rest.postMessage(dmChannelId, payload);

      return 'sent';
    } catch (error) {
      if (error instanceof DiscordApiError) {
        if (error.code === DISCORD_ERROR_CODE.cannotMessageUser) {
          return 'blocked';
        }

        if (error.code === DISCORD_ERROR_CODE.openingDmsTooFast) {
          return 'too-fast';
        }

        const wait = error.retryAfter ?? DEFAULT_RETRY_WAIT_SECONDS;

        if (
          canRetry &&
          error.status === DISCORD_RATE_LIMITED &&
          wait <= MAX_RETRY_WAIT_SECONDS
        ) {
          await new Promise((resolve) => setTimeout(resolve, wait * SECOND_MS));

          return this.deliver(discordId, payload, false);
        }
      }

      this.logger.warn(
        `Không nhắn riêng được cho ${discordId}: ${error instanceof Error ? error.message : String(error)}`,
      );

      return 'unsent';
    }
  }
}
