import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SLOTS_PER_TEAM, buildSlotId, parseSlotId } from '@guild/shared/lib';
import { teamNoticeReportSchema } from '@guild/shared/schemas';
import type {
  MatchFormation,
  TeamNoticeReport,
  TeamNoticeTarget,
} from '@guild/shared/schemas';

import { verifyResponse } from '../../config';
import { AttendanceService } from '../attendance/attendance.public';
import { BattleSessionsService } from '../battle-sessions/battle-sessions.public';
import { CharactersService } from '../characters/characters.public';
import { TeamBuilderService } from '../team-builder/team-builder.public';
import type { MessagePayload } from './commands/command.types';
import { DiscordRestClient } from './discord-rest';
import { buildTeamNotice } from './team-notice';
import type { TeamNoticeSlot } from './team-notice';

/** Shown when the battle the notices point at no longer exists. */
const SESSION_NOT_FOUND = 'Không tìm thấy trận đánh này.';

/** Shown when notices are requested before the line-up was announced. */
const NOT_ANNOUNCED_YET =
  'Ngày này chưa đóng điểm danh. Hãy gửi thông báo đội hình vào Discord trước khi nhắn riêng từng người.';

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
   * @returns Who was messaged and, for everyone else, why not
   * @throws NotFoundException when the battle day does not exist
   * @throws BadRequestException when the day's attendance is still open (nothing announced yet)
   */
  async notifyMembers(sessionId: string): Promise<TeamNoticeReport> {
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
    const notPresent: TeamNoticeTarget[] = [];
    const missingDiscordId: TeamNoticeTarget[] = [];

    for (const placement of placementsOf(saved.matches, members)) {
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
      } else {
        await this.deliver(
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
        sent.push(target);
      }
    }

    return verifyResponse(teamNoticeReportSchema, {
      sentCount: sent.length,
      totalCount: sent.length + notPresent.length + missingDiscordId.length,
      blocked: [],
      missingDiscordId,
      notPresent,
      unsent: [],
    } satisfies TeamNoticeReport);
  }

  /**
   * Open the member's DM and post their notice into it.
   * @param discordId - Discord user id of the recipient
   * @param payload - The notice
   * @returns A promise resolving once Discord accepted the message
   */
  private async deliver(
    discordId: string,
    payload: MessagePayload,
  ): Promise<void> {
    const dmChannelId = await this.rest.openDm(discordId);

    await this.rest.postMessage(dmChannelId, payload);
  }
}
