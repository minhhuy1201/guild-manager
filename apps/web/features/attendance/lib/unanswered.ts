import type { AttendanceRecord, BattleSession } from "@guild/shared/schemas";

import { recordKey } from "./record-key";

/**
 * How many battles of the week a character can still answer and has not: the number the member
 * card leads with. A battle the API already locked is left out - it can no longer be answered, so
 * counting it would nag about something nobody can fix.
 * @param sessions - Battles of the week, with the lock the API computed
 * @param records - Recorded answers, keyed by `recordKey`
 * @param characterId - Character whose answers are counted
 * @returns Number of open battles without an answer
 */
export function countUnanswered(
  sessions: Pick<BattleSession, "id" | "isDeadlinePassed">[],
  records: Record<string, Pick<AttendanceRecord, "isPresent">>,
  characterId: string
): number {
  return sessions.filter(
    (session) =>
      !session.isDeadlinePassed && !records[recordKey(characterId, session.id)]
  ).length;
}
