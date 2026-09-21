import {
  TACTIC_SCHEMA_VERSION,
  liftTacticScene,
  tacticSceneSchema,
  type TacticScene,
} from "@guild/shared/schemas";

/**
 * Read a scene document the API returned, bringing an older format up to the current one.
 *
 * The lift itself lives in `@guild/shared` so the API applies exactly the same one when it opens
 * the `stages` column; the app rewrites the document in the new format at the next save. Without
 * it, a format change would mean guessing SQL over a JSON column.
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

  const parsed = tacticSceneSchema.safeParse(liftTacticScene(raw));

  if (!parsed.success) {
    throw new Error("Bản vẽ không đọc được.");
  }

  return parsed.data;
}
