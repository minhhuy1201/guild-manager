import { TeamColor } from "@guild/shared/enums";

/** What one team colour renders as. */
interface TeamColorStyle {
  /** Vietnamese name of the colour, read out by the colour button and shown under its swatch */
  label: string;
  /** Header surface and its text, a complete Tailwind literal (Tailwind scans source text) */
  header: string;
  /** The dot beside the team name, the team colour at full strength; a complete Tailwind literal */
  marker: string;
  /**
   * Ring colour of the team's token on the tactics map. The team builder's headers are light tints
   * on a light page; the map is a dark picture with no theme, so this is a brighter solid shade of
   * the same hue (the dark theme's token, hand-converted because a canvas cannot read CSS tokens).
   */
  hex: string;
}

/*
 * Each colour is a faint wash in the header plus a full-strength dot beside the name. No bar along
 * the top edge: the card's rounded corner clipped it into an asymmetric curve. Text stays
 * `foreground` on every header so ten tinted columns do not compete with the member cards.
 */
export const TEAM_COLOR_STYLES: Record<TeamColor, TeamColorStyle> = {
  [TeamColor.JADE]: {
    label: "Ngọc bích",
    header: "bg-jade/15 text-foreground",
    marker: "bg-jade",
    hex: "#6fb59d",
  },
  [TeamColor.STONE]: {
    label: "Xám đá",
    header: "bg-foreground/[0.08] text-foreground",
    marker: "bg-foreground/45",
    hex: "#c2bdb7",
  },
  [TeamColor.NAVY]: {
    label: "Xanh navy",
    header: "bg-primary/15 text-foreground",
    marker: "bg-primary",
    hex: "#6c84c3",
  },
  [TeamColor.GOLD]: {
    label: "Vàng",
    header: "bg-gold/20 text-foreground",
    marker: "bg-gold",
    hex: "#d4b278",
  },
  [TeamColor.RED]: {
    label: "Đỏ",
    header: "bg-red/15 text-foreground",
    marker: "bg-red",
    hex: "#d8516a",
  },
  [TeamColor.PURPLE]: {
    label: "Tím",
    header: "bg-purple/15 text-foreground",
    marker: "bg-purple",
    hex: "#bd72c1",
  },
  [TeamColor.ORANGE]: {
    label: "Cam",
    header: "bg-orange/15 text-foreground",
    marker: "bg-orange",
    hex: "#f47f46",
  },
  [TeamColor.SKY]: {
    label: "Xanh trời",
    header: "bg-sky/20 text-foreground",
    marker: "bg-sky",
    hex: "#92dff2",
  },
};

/**
 * Colour each team takes until a manager picks another, keyed by team number. The guild splits its
 * ten teams into groups that share a colour; edit here to move a team into another group.
 */
const DEFAULT_TEAM_COLORS: Record<number, TeamColor> = {
  1: TeamColor.JADE,
  2: TeamColor.JADE,
  3: TeamColor.JADE,
  4: TeamColor.JADE,
  5: TeamColor.JADE,
  6: TeamColor.STONE,
  7: TeamColor.STONE,
  8: TeamColor.NAVY,
  9: TeamColor.GOLD,
  10: TeamColor.GOLD,
};

/**
 * Chosen colours of a screen that does not load them yet: every team takes its default group. Callers
 * pass this until teams can pick their own colour.
 */
export const NO_CHOSEN_COLORS: Readonly<Record<string, TeamColor>> = {};

/**
 * Resolves the colour a team is shown in.
 * @param team - Team number as shown in the team builder's header
 * @param colors - Colours teams were given, keyed by team number as a decimal string
 * @returns The chosen colour, or the team's default group colour
 * @throws When the team has no chosen colour and no default: a silent fallback would hide a team
 * missing from the table
 */
export function resolveTeamColor(
  team: number,
  colors: Readonly<Record<string, TeamColor>>
): TeamColor {
  const chosen = colors[String(team)];
  if (chosen) return chosen;

  const fallback = DEFAULT_TEAM_COLORS[team];
  if (!fallback) throw new Error(`Team ${team} has no default colour`);

  return fallback;
}
