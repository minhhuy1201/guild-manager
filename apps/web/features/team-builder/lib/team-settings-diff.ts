import type { TeamSettings } from "@guild/shared/schemas";

/**
 * How many fields of how many teams differ in the draft from the server: a team's name, its
 * colour and its icon count separately. A field with no value has no key, so clearing one and setting a new one
 * each count once, the same as changing it.
 * @param draft - Settings currently shown
 * @param saved - Settings as last read from the server
 * @returns Number of differing fields, 0 when nothing changed
 */
export function countSettingChanges(
  draft: TeamSettings,
  saved: TeamSettings
): number {
  return (
    countRecordChanges(draft.names, saved.names) +
    countRecordChanges(draft.colors, saved.colors) +
    countRecordChanges(draft.icons, saved.icons)
  );
}

/**
 * How many keys hold a different value in `draft` than in `saved`.
 * @param draft - Record currently shown
 * @param saved - Record as last read from the server
 * @returns Number of keys whose value differs, a missing key counting as a value
 */
function countRecordChanges(
  draft: Readonly<Record<string, string>>,
  saved: Readonly<Record<string, string>>
): number {
  const keys = new Set([...Object.keys(draft), ...Object.keys(saved)]);
  let count = 0;

  for (const key of keys) {
    if (draft[key] !== saved[key]) count += 1;
  }

  return count;
}
