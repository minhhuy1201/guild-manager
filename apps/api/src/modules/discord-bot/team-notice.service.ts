import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { teamNoticeReportSchema } from '@guild/shared/schemas';
import type {
  NotifyMembersInput,
  TeamNoticeReport,
  TeamNoticeTarget,
} from '@guild/shared/schemas';

import { verifyResponse } from '../../config';
import type { Env } from '../../config';
import { AttendanceService } from '../attendance/attendance.public';
import { BattleSessionsService } from '../battle-sessions/battle-sessions.public';
import { CharactersService } from '../characters/characters.public';
import { TeamBuilderService } from '../team-builder/team-builder.public';
import { DmSenderService } from './dm-sender.service';
import type { DmRecipient } from './dm-sender.service';
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

/**
 * Key of one (match, team) pair in the image lookup.
 * @param matchIndex - Stored match number, 1 or 2
 * @param team - Team number
 * @returns A string unique to the pair
 */
function pairKey(matchIndex: number, team: number): string {
  return `${matchIndex}:${team}`;
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
    private readonly dmSender: DmSenderService,
    private readonly config: ConfigService<Env, true>,
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
    const deliveries: { target: TeamNoticeTarget; recipient: DmRecipient }[] =
      [];

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
      } else {
        const file = imageFiles.get(
          pairKey(placement.matchIndex, placement.team),
        );

        deliveries.push({
          target,
          recipient: {
            discordId: member.discordId,
            payload: buildTeamNotice({
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
            files: file ? [file] : [],
          },
        });
      }
    }

    const results = await this.dmSender.sendAll(
      deliveries.map(({ recipient }) => recipient),
    );

    deliveries.forEach(({ target }, index) => {
      const bucket = { sent, blocked, unsent }[results[index]];

      bucket.push(target);
    });

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
}
