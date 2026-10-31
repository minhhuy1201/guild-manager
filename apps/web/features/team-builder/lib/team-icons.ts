import { TeamIcon } from "@guild/shared/enums";
import {
  ArrowDownRight,
  ArrowUpLeft,
  Castle,
  Eye,
  Footprints,
  MoveDiagonal,
  Shield,
  Swords,
  Truck,
  type LucideIcon,
} from "lucide-react";

/** What one team icon renders as. */
interface TeamIconStyle {
  /** Vietnamese name of the role, read out by the style button and shown under its cell */
  label: string;
  /** The Lucide glyph drawn in the team colour */
  Icon: LucideIcon;
}

/**
 * Every team icon with its label and glyph. A full `Record` so an icon added to the enum without an
 * entry here is a compile error.
 */
export const TEAM_ICONS: Record<TeamIcon, TeamIconStyle> = {
  [TeamIcon.CASTLE]: { label: "Trụ", Icon: Castle },
  [TeamIcon.SWORDS]: { label: "Công", Icon: Swords },
  [TeamIcon.SHIELD]: { label: "Thủ", Icon: Shield },
  [TeamIcon.FOOTPRINTS]: { label: "Cơ động", Icon: Footprints },
  [TeamIcon.EYE]: { label: "Trinh sát", Icon: Eye },
  [TeamIcon.TRUCK]: { label: "Bảo tiêu", Icon: Truck },
  [TeamIcon.TOP_LANE]: { label: "Top lane", Icon: ArrowUpLeft },
  [TeamIcon.MID_LANE]: { label: "Mid lane", Icon: MoveDiagonal },
  [TeamIcon.BOT_LANE]: { label: "Bot lane", Icon: ArrowDownRight },
};
