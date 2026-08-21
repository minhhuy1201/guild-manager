import { AttendanceStatus } from "@guild/shared/enums";

import type { PoolCandidate } from "./pool";

/** The bit of an attendance record this module needs. */
export interface AttendanceRecordLike {
  /** Character who marked attendance */
  characterId: string;
  /** Battle the record belongs to */
  sessionId: string;
  /** Whether they are showing up */
  status: AttendanceStatus;
}

/**
 * Everyone who said they are coming to one specific battle.
 * @param records - Attendance records of the open week
 * @param sessionId - Battle being arranged
 * @returns Ids of characters marked present for that battle
 */
export function presentCharacterIds(
  records: AttendanceRecordLike[],
  sessionId: string
): Set<string> {
  const present = records
    .filter(
      (record) =>
        record.sessionId === sessionId &&
        record.status === AttendanceStatus.PRESENT
    )
    .map((record) => record.characterId);

  return new Set(present);
}

/**
 * Narrow the roster to the people attending, keeping roster order.
 * @param characters - Full guild roster
 * @param presentIds - Ids of characters attending the battle
 * @returns Characters attending, in roster order
 */
export function selectPresentCharacters<T extends PoolCandidate>(
  characters: T[],
  presentIds: Set<string>
): T[] {
  return characters.filter((character) => presentIds.has(character.id));
}
