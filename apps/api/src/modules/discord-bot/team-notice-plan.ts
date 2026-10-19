import { SLOTS_PER_TEAM, buildSlotId, parseSlotId } from '@guild/shared/lib';
import type { MatchFormation, NotifyMembersInput } from '@guild/shared/schemas';

import type { TeamNoticeSlot } from './team-notice';

/** The columns of a guild member this service reads. */
export interface MemberRow {
  id: string;
  name: string;
  discordId: string | null;
}

/** A member the formation places, and where. */
export interface Placement {
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
export function placementsOf(
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
export function isWanted(
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
export function slotsOfTeam(
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
