import { can, type Actor } from "@guild/shared/lib";

import {
  SETTINGS_TAB,
  SETTINGS_TAB_CAPABILITY,
  type SettingsTab,
} from "@/config/settings-capabilities";

/**
 * The tabs the viewer may open.
 * @param actor - The viewer's role and Grants
 * @returns The granted tabs in display order, empty when none
 */
export function grantedTabs(actor: Actor): SettingsTab[] {
  return Object.values(SETTINGS_TAB).filter((tab) =>
    can(actor, SETTINGS_TAB_CAPABILITY[tab])
  );
}

/**
 * Pick the tab to show from the address.
 * @param value - The `tab` query parameter, null when absent
 * @param granted - The tabs the viewer may open, in display order
 * @returns The requested tab when granted, otherwise the first granted one; null when none is granted
 */
export function resolveTab(
  value: string | null,
  granted: readonly SettingsTab[]
): SettingsTab | null {
  return granted.find((tab) => tab === value) ?? granted[0] ?? null;
}
