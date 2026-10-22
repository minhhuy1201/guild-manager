import { Capability } from "@guild/shared/enums";

/** The Capabilities that each open a tab of the settings page; holding any one opens the page. */
export const SETTINGS_CAPABILITIES: readonly Capability[] = [
  Capability.SCHEDULE,
  Capability.MEMBERS,
  Capability.ATTENDANCE,
];
