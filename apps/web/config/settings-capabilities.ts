import { Capability } from "@guild/shared/enums";

/** The settings page tabs, in display order. */
export const SETTINGS_TAB = {
  battles: "battles",
  members: "members",
  leaves: "leaves",
} as const;

/** One of the settings tabs. */
export type SettingsTab = (typeof SETTINGS_TAB)[keyof typeof SETTINGS_TAB];

/** The Capability that opens each settings tab. */
export const SETTINGS_TAB_CAPABILITY: Record<SettingsTab, Capability> = {
  [SETTINGS_TAB.battles]: Capability.SCHEDULE,
  [SETTINGS_TAB.members]: Capability.MEMBERS,
  [SETTINGS_TAB.leaves]: Capability.ATTENDANCE,
};

/** The Capabilities that each open a tab of the settings page; holding any one opens the page. */
export const SETTINGS_CAPABILITIES: readonly Capability[] = Object.values(
  SETTINGS_TAB_CAPABILITY
);
