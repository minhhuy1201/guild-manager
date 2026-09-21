import {
  TACTIC_SCHEMA_VERSION,
  tacticSceneSchema,
  type TacticScene,
} from "@guild/shared/schemas";

/**
 * Read a scene document the API returned, bringing an older format up to the current one.
 *
 * Today there is exactly one format, so the body has a single branch — the point of the function is
 * that the branch exists: when the format changes, this is where the old document is lifted, and
 * the app rewrites it in the new format at the next save. Without it, a format change would mean
 * guessing SQL over a JSON column.
 *
 * @param raw - The scene as it came off the wire
 * @returns The scene in the current format
 * @throws Error in Vietnamese when the document is newer than this app, or does not parse
 */
export function migrateScene(raw: unknown): TacticScene {
  if (
    typeof raw === "object" &&
    raw !== null &&
    "schemaVersion" in raw &&
    typeof raw.schemaVersion === "number" &&
    raw.schemaVersion > TACTIC_SCHEMA_VERSION
  ) {
    throw new Error(
      "Bản vẽ được lưu bằng phiên bản mới hơn của ứng dụng. Hãy tải lại trang."
    );
  }

  const parsed = tacticSceneSchema.safeParse(raw);

  if (!parsed.success) {
    throw new Error("Bản vẽ không đọc được.");
  }

  return parsed.data;
}
