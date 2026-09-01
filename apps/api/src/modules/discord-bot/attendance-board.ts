import { canManageGuild } from '@guild/shared/lib';
import type { AttendanceRecord, BattleSession } from '@guild/shared/schemas';

import type { JwtPayload } from '../../common';
import type {
  ActionRow,
  ButtonComponent,
  CommandDeps,
  MessagePayload,
} from './commands/command.types';
import {
  decodeAttendanceButtonId,
  encodeAttendanceButtonId,
} from './custom-id';
import {
  BUTTON_STYLE,
  COMPONENT_TYPE,
  MAX_ACTION_ROWS,
} from './discord.constants';
import {
  callerDiscordId,
  type MessageComponentInteraction,
} from './interaction.schema';

/** Shown when the open week holds no battle day at all. */
const NO_SESSIONS = 'Tuần này chưa có ngày đánh nào.';

/**
 * `AttendanceService` derives `reason` from the request, and the bot never sends one — so pressing
 * "Không" here clears a reason typed on the website. Said out loud rather than let someone lose it
 * silently.
 */
const REASON_NOTE = 'Bấm "Không" ở đây sẽ xoá lý do vắng đã ghi trên web.';

/** Shown when a button's custom_id is not one this build knows how to read. */
const STALE_BUTTON =
  'Nút này không còn dùng được. Gõ lại /diem-danh để lấy bảng mới.';

/** Shown when the caller lost access between opening the board and pressing a button. */
const NOT_LINKED =
  'Bạn chưa được gán nhân vật nào. Nhờ admin thêm Discord ID của bạn.';

/** Who the board is about. The name is shown so an admin marking for others cannot mistake them. */
export interface BoardTarget {
  characterId: string;
  characterName: string;
}

/**
 * Whether this actor may still record an answer for this session.
 *
 * The rule is `AttendanceService`'s, mirrored here only to decide which buttons are worth showing —
 * every press is re-checked by the service.
 *
 * @param session - The session under consideration
 * @param isAdmin - Whether the actor manages the guild
 * @returns true when a button should be offered
 */
function canAct(session: BattleSession, isAdmin: boolean): boolean {
  return isAdmin || !session.isDeadlinePassed;
}

/**
 * The line describing one session's current answer.
 * @param session - The session
 * @param record - The target's record for it, or undefined when they never answered
 * @returns One line of the message body
 */
function describeSession(
  session: BattleSession,
  record: AttendanceRecord | undefined,
): string {
  const opponent = session.opponent ? ` · gặp ${session.opponent}` : '';
  const answer = record ? (record.isPresent ? 'Có' : 'Không') : 'chưa trả lời';
  const overdue = session.isDeadlinePassed ? ' · đã quá hạn' : '';

  return `${session.label}${opponent} — ${answer}${overdue}`;
}

/**
 * The pair of buttons for one session.
 *
 * The button matching the answer already on record is disabled: pressing it changes nothing, and a
 * disabled button is how the board shows what is currently chosen.
 *
 * @param session - The session the buttons record against
 * @param characterId - Who the answer is recorded for
 * @param record - The current record, or undefined
 * @returns One action row
 */
function buildRow(
  session: BattleSession,
  characterId: string,
  record: AttendanceRecord | undefined,
): ActionRow {
  /**
   * One button of the pair.
   * @param isPresent - The answer this button records
   * @returns The button component
   */
  const button = (isPresent: boolean): ButtonComponent => ({
    type: COMPONENT_TYPE.button,
    style: isPresent ? BUTTON_STYLE.success : BUTTON_STYLE.danger,
    label: `${session.label} · ${isPresent ? 'Có' : 'Không'}`,
    custom_id: encodeAttendanceButtonId({
      sessionId: session.id,
      characterId,
      isPresent,
    }),
    ...(record?.isPresent === isPresent ? { disabled: true } : {}),
  });

  return {
    type: COMPONENT_TYPE.actionRow,
    components: [button(true), button(false)],
  };
}

/**
 * Build the attendance board for one character.
 *
 * Read fresh on every call — a press records, then rebuilds from the database — so the message can
 * never drift from what the website shows.
 *
 * @param target - The character being marked, and the name to show
 * @param actor - Who is acting; decides which days still get buttons
 * @param deps - Services the board reads through
 * @returns The message body, ready to be wrapped as a reply or an update
 */
export async function buildAttendanceBoard(
  target: BoardTarget,
  actor: JwtPayload,
  deps: CommandDeps,
): Promise<MessagePayload> {
  const [sessions, allRecords] = await Promise.all([
    deps.battleSessions.listByWeek(),
    deps.attendance.getRecords(),
  ]);

  if (sessions.length === 0) {
    return { content: `Điểm danh · ${target.characterName}\n\n${NO_SESSIONS}` };
  }

  const records = new Map(
    allRecords
      .filter((record) => record.characterId === target.characterId)
      .map((record) => [record.sessionId, record]),
  );

  const isAdmin = canManageGuild(actor.role);
  const actionable = sessions.filter((session) => canAct(session, isAdmin));
  const shown = actionable.slice(0, MAX_ACTION_ROWS);
  const dropped = actionable.slice(MAX_ACTION_ROWS);

  const lines = sessions.map((session) =>
    describeSession(session, records.get(session.id)),
  );

  // Discord allows 5 action rows per message and a day costs one. Say which days lost their
  // buttons rather than let them disappear from an otherwise complete list.
  const note =
    dropped.length > 0
      ? `\n\nCòn ${dropped.length} ngày nữa (${dropped
          .map((session) => session.label)
          .join(', ')}) — điểm danh trên web.`
      : '';

  return {
    content: `Điểm danh · ${target.characterName}\n\n${lines.join('\n')}${note}\n\n${REASON_NOTE}`,
    components: shown.map((session) =>
      buildRow(session, target.characterId, records.get(session.id)),
    ),
  };
}

/**
 * Record one press, then rebuild the board from what the database now holds.
 *
 * The `characterId` in the custom_id is client data. It is passed to `AttendanceService.mark`
 * exactly as a request body would be, and that service — not this function — decides whether this
 * actor may mark that character. Nothing here re-implements the rule.
 *
 * @param interaction - The validated button press
 * @param deps - Services the handler reads and writes through
 * @returns The rebuilt board, or a sentence explaining why nothing was recorded
 * @throws HttpException raised by `AttendanceService.mark`, turned into a message by the router
 */
export async function handleAttendanceButton(
  interaction: MessageComponentInteraction,
  deps: CommandDeps,
): Promise<MessagePayload> {
  const pressed = decodeAttendanceButtonId(interaction.data.custom_id);

  if (!pressed) return { content: STALE_BUTTON };

  const resolved = await deps.actors.resolve(callerDiscordId(interaction));

  if (!resolved) return { content: NOT_LINKED };

  await deps.attendance.mark(
    {
      characterId: pressed.characterId,
      sessionId: pressed.sessionId,
      isPresent: pressed.isPresent,
    },
    resolved.actor,
  );

  const row = await deps.characters.findById(pressed.characterId);

  if (!row) return { content: STALE_BUTTON };

  return buildAttendanceBoard(
    { characterId: row.id, characterName: row.name },
    resolved.actor,
    deps,
  );
}
