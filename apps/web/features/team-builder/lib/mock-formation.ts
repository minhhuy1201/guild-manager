import { GuildClass } from "@shared/enums";

import type { Formation, Slot } from "../types/formation";

/** Number of teams in the war formation. */
export const TEAM_COUNT = 10;

/** Number of slots inside a single team. */
export const SLOTS_PER_TEAM = 6;

/**
 * Class constraint per position inside a team, applied to all ten teams.
 * `undefined` means the position accepts every guild class.
 *
 * These values are a demo starting point, not a game rule — they exist so all
 * three slot visuals (valid, wrong class, unconstrained) are reachable.
 * Editing this array is enough; nothing else depends on the specific classes.
 */
const POSITION_TEMPLATE: readonly (readonly GuildClass[] | undefined)[] = [
  [GuildClass.THIET_Y],
  [GuildClass.TO_VAN],
  [GuildClass.CUU_LINH, GuildClass.HUYET_HA],
  [GuildClass.LONG_NGAM, GuildClass.TOAI_MONG],
  undefined,
  undefined,
];

/**
 * Build the stable id of a slot from its coordinates.
 * @param team - Team number, 1..TEAM_COUNT
 * @param position - Row inside the team, 1..SLOTS_PER_TEAM
 * @returns Slot id, e.g. "team-3-pos-2"
 */
export function buildSlotId(team: number, position: number): string {
  return `team-${team}-pos-${position}`;
}

/**
 * Build the demo formation: TEAM_COUNT teams of SLOTS_PER_TEAM slots each,
 * every team sharing the same per-position class constraints.
 * @returns A formation with TEAM_COUNT * SLOTS_PER_TEAM flat slots
 */
export function createMockFormation(): Formation {
  const slots: Slot[] = [];

  for (let team = 1; team <= TEAM_COUNT; team += 1) {
    for (let position = 1; position <= SLOTS_PER_TEAM; position += 1) {
      const allowed = POSITION_TEMPLATE[position - 1];
      slots.push({
        id: buildSlotId(team, position),
        team,
        position,
        ...(allowed ? { allowedClasses: [...allowed] } : {}),
      });
    }
  }

  return { id: "guild-war-default", name: "Đội hình bang chiến", slots };
}
