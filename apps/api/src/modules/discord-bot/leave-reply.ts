import { createLeaveSchema } from '@guild/shared/schemas';

import type { CommandDeps, CommandReply } from './commands/command.types';
import { parseLeaveDateInput } from './leave-date-input';
import { resolveOwnCaller } from './own-caller';
import { ephemeralText } from './reply';

const BAD_DATE = 'Ngày phải có dạng dd/mm, ví dụ 05/10.';

/**
 * `YYYY-MM-DD` range as `dd/mm - dd/mm`.
 * @param startDate - First day
 * @param endDate - Last day
 * @returns The range as members write it
 */
function formatLeaveRange(startDate: string, endDate: string): string {
  const dayMonth = (key: string): string =>
    `${key.slice(8, 10)}/${key.slice(5, 7)}`;

  return `${dayMonth(startDate)} - ${dayMonth(endDate)}`;
}

/**
 * File a leave for the caller and phrase the private answer - the answer to the leave modal.
 * A refusal from the service (overlap, already ended) is thrown and becomes the answer in the router.
 * @param discordId - Discord ID from the signed interaction
 * @param raw - The three texts the member typed; `to` and `reason` come straight from the form
 * @param deps - Services the bot reaches
 * @returns The reply Discord shows only to the caller
 */
export async function submitLeave(
  discordId: string,
  raw: { from: string; to: string; reason: string | null },
  deps: CommandDeps,
): Promise<CommandReply> {
  const caller = await resolveOwnCaller(discordId, deps);
  if (!caller.ok) return caller.reply;

  const today = deps.clock.now();
  const startDate = parseLeaveDateInput(raw.from, today);
  if (!startDate) return ephemeralText(BAD_DATE);

  const endDate = parseLeaveDateInput(raw.to, today, startDate);
  if (!endDate) return ephemeralText(BAD_DATE);

  const parsed = createLeaveSchema.safeParse({
    characterId: caller.characterId,
    startDate,
    endDate,
    reason: raw.reason,
  });
  if (!parsed.success) return ephemeralText(parsed.error.issues[0].message);

  const leave = await deps.leaves.create(parsed.data, caller.actor);

  return ephemeralText(
    `Đã khai nghỉ ${formatLeaveRange(leave.startDate, leave.endDate)}.`,
  );
}
