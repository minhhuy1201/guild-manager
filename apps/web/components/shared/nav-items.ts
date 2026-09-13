import {
  ClipboardCheck,
  History,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";

import { ROUTES } from "@/config/routes";

/** One entry of the main navigation. */
export interface NavItem {
  /** Route the entry leads to */
  href: string;
  /** Full name, shown in the header nav */
  label: string;
  /** Name that fits a phone's tab bar, a quarter of the screen wide */
  shortLabel: string;
  /** Icon shown before the name */
  icon: LucideIcon;
  /** Shown to admins only — display alone; the proxy and the API do the real gating */
  adminOnly: boolean;
}

/** The main navigation, in display order — shared by the header nav and the phone's tab bar. */
export const NAV_ITEMS: readonly NavItem[] = [
  {
    href: ROUTES.attendance,
    label: "Điểm danh",
    shortLabel: "Điểm danh",
    icon: ClipboardCheck,
    adminOnly: false,
  },
  {
    href: ROUTES.attendanceHistory,
    label: "Lịch sử điểm danh",
    shortLabel: "Lịch sử",
    icon: History,
    adminOnly: false,
  },
  {
    href: ROUTES.teamBuilder,
    label: "Xếp team",
    shortLabel: "Xếp team",
    icon: Users,
    adminOnly: true,
  },
  {
    href: ROUTES.settings,
    label: "Thiết lập",
    shortLabel: "Thiết lập",
    icon: Settings,
    adminOnly: true,
  },
];

/**
 * The entries a viewer is shown.
 * @param isAdmin - Whether the viewer is an admin
 * @returns Every entry for an admin, the non-admin ones otherwise
 */
export function navItemsFor(isAdmin: boolean): NavItem[] {
  return NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);
}
