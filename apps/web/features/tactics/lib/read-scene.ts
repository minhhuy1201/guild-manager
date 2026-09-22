import { assertNever } from "@guild/shared/lib";
import { readTacticScene, type TacticScene } from "@guild/shared/schemas";

/** A scene document this app cannot open, carrying the sentence to show in place of the editor. */
export class SceneReadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SceneReadError";
  }
}

/**
 * Read a scene document the API returned, through the same pipeline the API used to store it.
 *
 * The API has already lifted and parsed it; this second read exists for the tab left open across a
 * deploy, whose code is older than the document the new API hands it.
 * @param raw - The scene as it came off the wire
 * @returns The scene in the current format
 * @throws SceneReadError in Vietnamese when the document is newer than this app, or does not parse
 */
export function readScene(raw: unknown): TacticScene {
  const read = readTacticScene(raw);

  switch (read.status) {
    case "ok":
      return read.scene;
    case "newer":
      throw new SceneReadError(
        "Bản vẽ được lưu bằng phiên bản mới hơn của ứng dụng. Hãy tải lại trang."
      );
    case "corrupt":
      throw new SceneReadError("Bản vẽ không đọc được.");
    default:
      return assertNever(read);
  }
}
