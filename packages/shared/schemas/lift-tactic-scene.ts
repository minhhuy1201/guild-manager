import type { TacticColor } from "../enums/tactic.enum";

import {
  TACTIC_SCHEMA_VERSION,
  tacticSceneSchema,
  type TacticScene,
} from "./tactic.schema";

/**
 * What reading a stored scene document came to. Each side turns the two failures into its own
 * error.
 */
export type TacticSceneRead =
  /** The document, lifted to the current format and parsed */
  | { status: "ok"; scene: TacticScene }
  /** Written by a newer app than this one - not guessed at */
  | { status: "newer" }
  /** Does not parse even after lifting */
  | { status: "corrupt" };

/** The colour v1 documents could carry and v2 no longer offers. */
const V1_DROPPED_COLOR = "white";

/** What a v1 white element is drawn in from v2 on. */
const V1_DROPPED_COLOR_REPLACEMENT: TacticColor = "black";

/**
 * Bring a stored scene document up to `TACTIC_SCHEMA_VERSION`.
 *
 * Both sides call it before parsing: the API when it opens the `stages` column, the web when it
 * reads a response. Without it, every tactic drawn in white before v2 would fail validation, which
 * reads to a user as "bản vẽ không đọc được" rather than as a colour that was retired.
 *
 * Anything shaped unexpectedly is handed back untouched rather than patched over — Zod is what
 * reports it, in one place and in Vietnamese.
 * @param raw - The scene document as it came out of the database or off the wire
 * @returns The document in the current format, ready to parse
 */
export function liftTacticScene(raw: unknown): unknown {
  if (!isRecord(raw) || raw.schemaVersion !== 1) {
    return raw;
  }

  return {
    ...raw,
    schemaVersion: TACTIC_SCHEMA_VERSION,
    stages: Array.isArray(raw.stages) ? raw.stages.map(liftStage) : raw.stages,
  };
}

/**
 * Read a stored scene document: refuse one from a newer app, lift an older one, then parse.
 *
 * The one read pipeline both sides run - the API on the `stages` column, the web on a response -
 * so the version rule cannot drift between them.
 * @param raw - The scene document as it came out of the database or off the wire
 * @returns The parsed scene, or which of the two failures it was
 */
export function readTacticScene(raw: unknown): TacticSceneRead {
  // Checked before the schema so a document from a newer app gets its own sentence rather than the
  // generic "invalid literal" Zod would produce for `schemaVersion`.
  if (
    isRecord(raw) &&
    typeof raw.schemaVersion === "number" &&
    raw.schemaVersion > TACTIC_SCHEMA_VERSION
  ) {
    return { status: "newer" };
  }

  const parsed = tacticSceneSchema.safeParse(liftTacticScene(raw));

  return parsed.success
    ? { status: "ok", scene: parsed.data }
    : { status: "corrupt" };
}

/**
 * One stage of a v1 document.
 * @param stage - The stage as stored
 * @returns The stage with every element lifted
 */
function liftStage(stage: unknown): unknown {
  if (!isRecord(stage) || !Array.isArray(stage.elements)) {
    return stage;
  }

  return { ...stage, elements: stage.elements.map(liftElement) };
}

/**
 * One element of a v1 document.
 * @param element - The element as stored
 * @returns The element, repainted when it was drawn in the retired colour
 */
function liftElement(element: unknown): unknown {
  if (!isRecord(element) || element.color !== V1_DROPPED_COLOR) {
    return element;
  }

  return { ...element, color: V1_DROPPED_COLOR_REPLACEMENT };
}

/**
 * Whether a value is a plain object whose keys can be read.
 * @param value - The value to narrow
 * @returns True for a non-null, non-array object
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
