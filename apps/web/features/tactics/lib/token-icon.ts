import {
  isNumberIcon,
  numberIconDigits,
  type TacticColor,
  type TacticLucideIcon,
  type TacticTokenIcon,
  type TacticTokenSize,
} from "@guild/shared/enums";
import type { TacticToken } from "@guild/shared/schemas";
import {
  Anchor,
  Bomb,
  Castle,
  Crosshair,
  Crown,
  Eye,
  Flag,
  Flame,
  Footprints,
  Gem,
  Heart,
  MapPin,
  Shield,
  Skull,
  Star,
  Swords,
  Target,
  Tent,
  Truck,
  Users,
  type LucideIcon,
} from "lucide-react";

import { teamColorGroup, type TeamColorGroup } from "@/lib/team-color-group";
import { TOKEN_ICON_PATHS } from "./icon-paths";

/**
 * How an icon key is drawn: lucide artwork, or the digits of a numbered team. The lucide variant
 * carries both forms of the same drawing — the component for the DOM, the flattened paths for the
 * canvas — so neither caller has to narrow the key a second time.
 */
export type TokenIconArt =
  | { kind: "lucide"; Icon: LucideIcon; paths: readonly string[] }
  | { kind: "digits"; digits: string };

/**
 * Every lucide icon key the contract allows, mapped to the component that draws it. Declared as a
 * full `Record` so adding a key to the enum without an icon here is a compile error.
 */
export const TOKEN_ICON_COMPONENTS: Record<TacticLucideIcon, LucideIcon> = {
  swords: Swords,
  shield: Shield,
  flag: Flag,
  crosshair: Crosshair,
  footprints: Footprints,
  eye: Eye,
  target: Target,
  castle: Castle,
  tent: Tent,
  anchor: Anchor,
  bomb: Bomb,
  crown: Crown,
  flame: Flame,
  gem: Gem,
  heart: Heart,
  "map-pin": MapPin,
  skull: Skull,
  star: Star,
  truck: Truck,
  users: Users,
};

/**
 * Resolve an icon key to what draws it: a lucide component, or the digits a number icon shows.
 * @param key - One of TACTIC_TOKEN_ICONS
 * @returns The lucide component, or the digits — callers switch on `kind`
 */
export function tokenIcon(key: TacticTokenIcon): TokenIconArt {
  return isNumberIcon(key)
    ? { kind: "digits", digits: numberIconDigits(key) }
    : {
        kind: "lucide",
        Icon: TOKEN_ICON_COMPONENTS[key],
        paths: TOKEN_ICON_PATHS[key],
      };
}

/** Token circle radius per size, in virtual map units. */
/** Gap between a token's circle and the label under it, in virtual map units. */
export const TOKEN_LABEL_GAP = 6;

/** Font size of a token's label, in virtual map units. */
export const TOKEN_LABEL_FONT_SIZE = 22;

export const TOKEN_RADIUS: Record<TacticTokenSize, number> = {
  sm: 22,
  md: 32,
  lg: 46,
};

/** Hex each drawing colour renders as. The stored value stays the key. */
export const COLOR_HEX: Record<TacticColor, string> = {
  blue: "#3b82f6",
  red: "#e5484d",
  yellow: "#f5c518",
  black: "#101114",
};

/**
 * Hex a numbered team token's ring is drawn in, per team colour group. The team builder's headers
 * are light tints on a light page; the map is a dark picture, so each group is drawn as a brighter,
 * solid shade of the same hue (jade and gold are the dark theme's tokens, navy is the primary's hue
 * lifted to be seen at all). Fixed like COLOR_HEX: the map has no theme.
 */
export const TEAM_GROUP_HEX: Record<TeamColorGroup, string> = {
  jade: "#6fb59d",
  stone: "#c2bdb7",
  navy: "#6c84c3",
  gold: "#d4b278",
};

/**
 * The colour a token's ring - and everything drawn around it, its halo and its trail - takes. A
 * numbered team wears its team builder group, so "Đội 3" reads as the same team on both screens; any
 * other token wears the colour it was drawn in. Resolved on every render rather than stored, so
 * drawings saved before this rule pick it up and regrouping a team recolours the map too.
 * @param token - The token being drawn
 * @returns The hex to draw its ring in
 */
export function tokenBorderHex(token: TacticToken): string {
  const group = isNumberIcon(token.icon)
    ? teamColorGroup(Number(numberIconDigits(token.icon)))
    : null;

  return group ? TEAM_GROUP_HEX[group] : COLOR_HEX[token.color];
}

/** Vietnamese name of each drawing colour, for the toolbar's accessible labels. */
export const COLOR_LABELS: Record<TacticColor, string> = {
  blue: "Xanh dương",
  red: "Đỏ",
  yellow: "Vàng",
  black: "Đen",
};

/**
 * What a token's circle is filled with, per colour. Every colour but black sits on the dark disc
 * the map was designed around; black needs the light one, or the icon disappears into the fill.
 */
export const TOKEN_FILL: Record<TacticColor, string> = {
  blue: "rgba(12, 14, 18, 0.72)",
  red: "rgba(12, 14, 18, 0.72)",
  yellow: "rgba(12, 14, 18, 0.72)",
  black: "rgba(244, 244, 245, 0.86)",
};
