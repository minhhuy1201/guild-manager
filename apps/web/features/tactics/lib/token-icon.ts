import type {
  TacticColor,
  TacticTokenIcon,
  TacticTokenSize,
} from "@guild/shared/enums";
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

/**
 * Every icon key the contract allows, mapped to the component that draws it. Declared as a full
 * `Record` so adding a key to the enum without an icon here is a compile error.
 */
export const TOKEN_ICON_COMPONENTS: Record<TacticTokenIcon, LucideIcon> = {
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
 * Resolve an icon key to its component.
 * @param key - One of TACTIC_TOKEN_ICONS
 * @returns The lucide component drawn inside the token
 */
export function tokenIcon(key: TacticTokenIcon): LucideIcon {
  return TOKEN_ICON_COMPONENTS[key];
}

/** Token circle radius per size, in virtual map units. */
export const TOKEN_RADIUS: Record<TacticTokenSize, number> = {
  sm: 22,
  md: 32,
  lg: 46,
};

/** Hex each drawing colour renders as. The stored value stays the key. */
export const COLOR_HEX: Record<TacticColor, string> = {
  red: "#e5484d",
  blue: "#3b82f6",
  yellow: "#f5c518",
  white: "#f5f5f5",
};

/** Vietnamese name of each drawing colour, for the toolbar's accessible labels. */
export const COLOR_LABELS: Record<TacticColor, string> = {
  red: "Đỏ",
  blue: "Xanh",
  yellow: "Vàng",
  white: "Trắng",
};
