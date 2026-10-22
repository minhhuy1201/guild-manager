import {
  ClipboardCheck,
  History,
  Settings,
  Swords,
  Users,
  type LucideIcon,
} from "lucide-react";

import { Capability } from "@guild/shared/enums";
import { can, type Actor } from "@guild/shared/lib";

import { ROUTES } from "@/config/routes";
import { SETTINGS_CAPABILITIES } from "@/config/settings-capabilities";

/** One entry of the main navigation. */
export interface NavItem {
  /** Route the entry leads to */
  href: string;
  /** Full name, shown in the header nav */
  label: string;
  /** Name that fits one slot of the phone's tab bar */
  shortLabel: string;
  /** Icon shown before the name */
  icon: LucideIcon;
  /**
   * Shown to a viewer holding any of these Capabilities, to everyone when empty - display alone; the
   * proxy, the page and the API do the real gating
   */
  capabilities: readonly Capability[];
  /** Left out of the phone's tab bar - the page needs a wide screen (drag-and-drop, the map) */
  desktopOnly: boolean;
}

/** The main navigation, in display order - shared by the header nav and the phone's tab bar. */
export const NAV_ITEMS: readonly NavItem[] = [
  {
    href: ROUTES.attendance,
    label: "Điểm danh",
    shortLabel: "Điểm danh",
    icon: ClipboardCheck,
    capabilities: [],
    desktopOnly: false,
  },
  {
    href: ROUTES.attendanceHistory,
    label: "Lịch sử điểm danh",
    shortLabel: "Lịch sử",
    icon: History,
    capabilities: [],
    desktopOnly: false,
  },
  {
    href: ROUTES.teamBuilder,
    label: "Xếp team",
    shortLabel: "Xếp team",
    icon: Users,
    capabilities: [Capability.TEAM_BUILDER],
    desktopOnly: true,
  },
  {
    href: ROUTES.tactics,
    label: "Chiến thuật",
    shortLabel: "Chiến thuật",
    icon: Swords,
    capabilities: [],
    desktopOnly: true,
  },
  {
    href: ROUTES.settings,
    label: "Thiết lập",
    shortLabel: "Thiết lập",
    icon: Settings,
    capabilities: SETTINGS_CAPABILITIES,
    desktopOnly: false,
  },
];

/**
 * The entries a viewer is shown.
 * @param actor - The viewer's role and Grants
 * @returns The entries open to everyone plus those whose Capability the viewer holds
 */
export function navItemsFor(actor: Actor): NavItem[] {
  return NAV_ITEMS.filter(
    ({ capabilities }) =>
      capabilities.length === 0 ||
      capabilities.some((capability) => can(actor, capability))
  );
}
