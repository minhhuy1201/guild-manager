import {
  TACTIC_NUMBER_ICONS,
  type TacticTokenIcon,
} from "@guild/shared/enums";

/** A token the palette always offers, independent of what an admin saved. */
export interface BuiltInToken {
  /** Label the token carries onto the map */
  label: string;
  /** Icon key, resolved to a component by `tokenIcon` */
  icon: TacticTokenIcon;
}

/** How many numbered teams the palette offers, matching the team builder's ten columns. */
const NUMBERED_TEAM_COUNT = TACTIC_NUMBER_ICONS.length;

/** The three groups the palette shows, in display order. */
export const TOKEN_GROUPS = ["insignia", "team", "custom"] as const;

/** One group of the palette. */
export type TokenGroup = (typeof TOKEN_GROUPS)[number];

/** Vietnamese heading of each palette group. */
export const TOKEN_GROUP_LABELS: Record<TokenGroup, string> = {
  insignia: "Quân hiệu",
  team: "Đội",
  custom: "Custom",
};

/**
 * The palette's named roles — the "Quân hiệu" group.
 */
export const INSIGNIA_TOKENS: readonly BuiltInToken[] = [
  { label: "Đội công", icon: "swords" },
  { label: "Đội thủ", icon: "shield" },
  { label: "Cơ động", icon: "footprints" },
  { label: "Trinh sát", icon: "eye" },
  { label: "Tập kết", icon: "flag" },
  { label: "Đội trụ", icon: "castle" },
  { label: "Bảo tiêu", icon: "truck" },
];

/**
 * The ten numbered teams — the "Đội" group, each carrying its own number as its icon so the teams
 * are told apart at a glance, on the map and in a palette that shows icons alone.
 * The numbers are labels, NOT `TeamName` rows: a tactic is a snapshot of an old decision and must
 * not change when a team is renamed.
 */
export const TEAM_TOKENS: readonly BuiltInToken[] = Array.from(
  { length: NUMBERED_TEAM_COUNT },
  (_, index) => ({
    label: `Đội ${index + 1}`,
    icon: TACTIC_NUMBER_ICONS[index],
  })
);

/** Every entry the palette offers without an admin saving anything, in display order. */
export const BUILT_IN_TOKENS: readonly BuiltInToken[] = [
  ...INSIGNIA_TOKENS,
  ...TEAM_TOKENS,
];

/**
 * The entry the palette starts on, so opening a tactic is already one click from dropping the most
 * common unit instead of two.
 */
export const DEFAULT_PALETTE_TOKEN: BuiltInToken = INSIGNIA_TOKENS[0];
