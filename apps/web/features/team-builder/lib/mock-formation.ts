import { GuildClass } from "@guild/shared/enums";

import type { Formation, Slot } from "../types/formation";

/** Number of teams in the war formation. */
export const TEAM_COUNT = 10;

/** Number of slots inside a single team. */
export const SLOTS_PER_TEAM = 6;

/**
 * Suggested guild class per position inside a team, applied to all ten teams.
 * `undefined` means the empty slot just reads "Ô trống".
 *
 * This is a display hint only — no slot ever rejects a character. Editing this
 * array is enough; nothing else depends on the specific classes.
 */
const SUGGESTED_CLASS_TEMPLATE: readonly (GuildClass | undefined)[] = [
  undefined,
  GuildClass.TO_VAN,
  GuildClass.TO_VAN,
  undefined,
  undefined,
  undefined,
];

/**
 * Build the stable id of a slot from its coordinates.
 * @param team - Team number, 1..TEAM_COUNT
 * @param position - Row inside the team, 1..SLOTS_PER_TEAM
 * @returns Slot id, e.g. "team-3-pos-2"
 */
function buildSlotId(team: number, position: number): string {
  return `team-${team}-pos-${position}`;
}

/**
 * Build the demo formation: TEAM_COUNT teams of SLOTS_PER_TEAM slots each,
 * every team sharing the same per-position class suggestions.
 * @returns A formation with TEAM_COUNT * SLOTS_PER_TEAM flat slots
 */
export function createMockFormation(): Formation {
  const slots: Slot[] = [];

  for (let team = 1; team <= TEAM_COUNT; team += 1) {
    for (let position = 1; position <= SLOTS_PER_TEAM; position += 1) {
      const suggested = SUGGESTED_CLASS_TEMPLATE[position - 1];
      slots.push({
        id: buildSlotId(team, position),
        team,
        position,
        ...(suggested ? { suggestedClass: suggested } : {}),
      });
    }
  }

  return { id: "guild-war-default", name: "Đội hình bang chiến", slots };
}

/**
 * The layout the screen renders. Static data, built once at module load so the
 * memos that depend on `FORMATION.slots` never rerun. It lives here rather than
 * inside one hook because both the draft and the pool measure themselves
 * against the same slot list.
 */
export const FORMATION = createMockFormation();
