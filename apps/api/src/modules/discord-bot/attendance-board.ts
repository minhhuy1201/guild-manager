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
  isEphemeralPress,
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

/**
 * Shown whenever a Discord ID resolves to nobody — on a command and on a button press alike.
 * Exported so the two commands say it in the same words: three copies of one sentence drift.
 */
export const NOT_LINKED =
  'Bạn chưa được gán nhân vật nào. Nhờ admin thêm Discord ID của bạn.';

/** Shown to a rescue admin who has no character of their own to mark. */
const NO_OWN_CHARACTER =
  'Tài khoản admin này không gắn với nhân vật nào — dùng /diem-danh-ho.';

/**
 * What one button press produced.
 *
 * A refusal is a separate variant rather than a board whose body happens to be a sentence: the
 * router turns it into a private reply, and rewriting a public `/diem-danh-ho` message with
 * "you are not linked" would let any bystander wipe the board for everyone.
 */
export type AttendanceButtonOutcome =
  | { kind: 'board'; body: MessagePayload }
  | { kind: 'refusal'; message: string };

/** Who the board is about. The name is shown so an admin marking for others cannot mistake them. */
export interface BoardTarget {
  characterId: string;
  characterName: string;
  /** Mentioned in the heading when present, so a public board reaches the person it is about. */
  discordId: string | null;
}

/** Status marker per day, so the whole week is readable at a glance instead of word by word. */
const STATUS_ICON = {
  unanswered: '⬜',
  present: '✅',
  absent: '❌',
} as const;

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
  const overdue = session.isDeadlinePassed ? ' · đã quá hạn' : '';

  if (!record) {
    return `${STATUS_ICON.unanswered} **${session.label}**${opponent} — chưa trả lời${overdue}`;
  }

  const icon = record.isPresent ? STATUS_ICON.present : STATUS_ICON.absent;
  const answer = record.isPresent ? 'CÓ' : 'KHÔNG';

  return `${icon} **${session.label}**${opponent} — **${answer}**${overdue}`;
}

/**
 * The pair of buttons for one session.
 *
 * Exactly one button per row is ever coloured — the answer currently on record, which also carries a
 * ✔. The other stays grey. Nothing is disabled: Discord renders a disabled button faded, which reads
 * as "you cannot press this" rather than "this is your answer", and pressing the same answer twice
 * is harmless anyway.
 *
 * The day is repeated in every label because Discord stacks all action rows below the message body
 * instead of interleaving them with the text — without it, five rows of buttons look identical.
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
  const button = (isPresent: boolean): ButtonComponent => {
    const isChosen = record?.isPresent === isPresent;
    const chosenStyle = isPresent ? BUTTON_STYLE.success : BUTTON_STYLE.danger;
    const answer = isPresent ? 'Có' : 'Không';

    return {
      type: COMPONENT_TYPE.button,
      style: isChosen ? chosenStyle : BUTTON_STYLE.secondary,
      label: `${isChosen ? '✔ ' : ''}${session.label} · ${answer}`,
      custom_id: encodeAttendanceButtonId({
        sessionId: session.id,
        characterId,
        isPresent,
      }),
    };
  };

  return {
    type: COMPONENT_TYPE.actionRow,
    components: [button(true), button(false)],
  };
}

/**
 * The board's first line: who it is about.
 * @param target - The character being marked
 * @returns A markdown heading, mentioning the person when their Discord ID is known
 */
function buildHeading(target: BoardTarget): string {
  const mention = target.discordId ? ` (<@${target.discordId}>)` : '';

  return `## Điểm danh · ${target.characterName}${mention}`;
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
    return { content: `${buildHeading(target)}\n\n${NO_SESSIONS}` };
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
    // `-#` is Discord's subtext: the warning has to be present without competing with the answers.
    content: `${buildHeading(target)}\n\n${lines.join('\n')}${note}\n\n-# ${REASON_NOTE}`,
    components: shown.map((session) =>
      buildRow(session, target.characterId, records.get(session.id)),
    ),
  };
}

/**
 * The board plus a line naming who its buttons are for.
 *
 * Discord has no way to disable a button for some viewers and not others — a message carries one
 * set of components for everybody — so a public board is pressable by the whole channel and the
 * refusal only arrives after the press. Saying up front who it is for is what keeps a bystander
 * from pressing at all. Ephemeral boards do not carry it: their single viewer is by definition
 * allowed to press.
 *
 * @param board - The board body
 * @param discordId - Discord ID of the person the board is about, when known
 * @returns A new body with the note appended
 */
export function withPressNote(
  board: MessagePayload,
  discordId: string | null,
): MessagePayload {
  const who = discordId ? `<@${discordId}>` : 'chủ nhân vật này';

  return {
    ...board,
    content: `${board.content}\n-# Chỉ ${who} và admin bấm được các nút này.`,
  };
}

/**
 * Record one press, then rebuild the board from what the database now holds.
 *
 * The `characterId` in the custom_id is client data. It is passed to `AttendanceService.mark`
 * exactly as a request body would be, and that service — not this function — decides whether this
 * actor may mark that character. Nothing here re-implements the rule.
 *
 * The board is rebuilt from the *presser's* capabilities, which matters only on the public
 * `/diem-danh-ho` message: after the member it is about presses once, the rows for days already past
 * their deadline disappear, because a member cannot act on those. The admin who posted it re-runs
 * the command to get them back. Encoding "an admin opened this" in the custom_id would fix the
 * display, but custom_id is client data, so it would only ever show buttons the service then
 * refuses — a worse trade than the occasional re-run.
 *
 * @param interaction - The validated button press
 * @param deps - Services the handler reads and writes through
 * @returns The rebuilt board, or the sentence explaining why nothing was recorded
 * @throws HttpException raised by `AttendanceService.mark`, turned into a message by the router
 */
export async function handleAttendanceButton(
  interaction: MessageComponentInteraction,
  deps: CommandDeps,
): Promise<AttendanceButtonOutcome> {
  const pressed = decodeAttendanceButtonId(interaction.data.custom_id);

  if (!pressed) return { kind: 'refusal', message: STALE_BUTTON };

  const resolved = await deps.actors.resolve(callerDiscordId(interaction));

  if (!resolved) return { kind: 'refusal', message: NOT_LINKED };

  await deps.attendance.mark(
    {
      characterId: pressed.characterId,
      sessionId: pressed.sessionId,
      isPresent: pressed.isPresent,
    },
    resolved.actor,
  );

  const row = await deps.characters.findById(pressed.characterId);

  if (!row) return { kind: 'refusal', message: STALE_BUTTON };

  const board = await buildAttendanceBoard(
    { characterId: row.id, characterName: row.name, discordId: row.discordId },
    resolved.actor,
    deps,
  );

  return {
    kind: 'board',
    body: isEphemeralPress(interaction)
      ? board
      : withPressNote(board, row.discordId),
  };
}

/**
 * The attendance board for whoever is acting, resolved from their Discord ID.
 *
 * Shared by `/diem-danh` and the "Điểm danh ngay" button on a `/thong-bao` announcement. The two
 * differ only in how the reply is wrapped, and two copies of this resolve-then-check chain would
 * drift apart the first time one of the refusals is reworded.
 *
 * @param discordId - Discord ID read out of the signed interaction
 * @param deps - Services the board reads through
 * @returns The board, or a body explaining why there is none
 */
export async function buildOwnBoard(
  discordId: string,
  deps: CommandDeps,
): Promise<MessagePayload> {
  const resolved = await deps.actors.resolve(discordId);

  if (!resolved) return { content: NOT_LINKED };
  if (!resolved.characterId) return { content: NO_OWN_CHARACTER };

  const row = await deps.characters.findById(resolved.characterId);

  if (!row) return { content: NOT_LINKED };

  return buildAttendanceBoard(
    { characterId: row.id, characterName: row.name, discordId: row.discordId },
    resolved.actor,
    deps,
  );
}
