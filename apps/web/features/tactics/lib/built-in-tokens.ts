import type { TacticTokenIcon } from "@guild/shared/enums";

/** A token the palette always offers, independent of what an admin saved. */
export interface BuiltInToken {
  /** Label the token carries onto the map */
  label: string;
  /** Icon key, resolved to a component by `tokenIcon` */
  icon: TacticTokenIcon;
}

/** How many numbered teams the palette offers, matching the team builder's ten columns. */
const NUMBERED_TEAM_COUNT = 10;

/**
 * The palette's fixed entries: seven roles, then the ten numbered teams.
 * The numbers are labels, NOT `TeamName` rows — a tactic is a snapshot of an old decision and must
 * not change when a team is renamed.
 */
export const BUILT_IN_TOKENS: readonly BuiltInToken[] = [
  { label: "Đội công", icon: "swords" },
  { label: "Đội thủ", icon: "shield" },
  { label: "Cơ động", icon: "footprints" },
  { label: "Trinh sát", icon: "eye" },
  { label: "Tập kết", icon: "flag" },
  { label: "Đội trụ", icon: "castle" },
  { label: "Bảo tiêu", icon: "truck" },
  ...Array.from({ length: NUMBERED_TEAM_COUNT }, (_, index) => ({
    label: `Đội ${index + 1}`,
    icon: "users" as const,
  })),
];
