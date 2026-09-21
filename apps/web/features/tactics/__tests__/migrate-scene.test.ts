import { describe, expect, it } from "vitest";
import { TACTIC_SCHEMA_VERSION } from "@guild/shared/schemas";

import { migrateScene } from "../lib/migrate-scene";

const scene = {
  schemaVersion: TACTIC_SCHEMA_VERSION,
  stages: [{ id: "s1", name: "Giai đoạn 1", elements: [] }],
};

describe("migrateScene", () => {
  it("passes a current scene through untouched", () => {
    expect(migrateScene(scene)).toEqual(scene);
  });

  it("throws a Vietnamese error for a newer document", () => {
    expect(() =>
      migrateScene({ ...scene, schemaVersion: TACTIC_SCHEMA_VERSION + 1 })
    ).toThrow(/phiên bản mới hơn/);
  });

  it("repaints a v1 white element black instead of refusing the document", () => {
    const white = {
      schemaVersion: 1,
      stages: [
        {
          id: "s1",
          name: "Giai đoạn 1",
          elements: [
            {
              kind: "text",
              id: "t1",
              x: 10,
              y: 10,
              text: "Tập kết",
              color: "white",
              fontSize: 24,
            },
          ],
        },
      ],
    };

    const lifted = migrateScene(white);

    expect(lifted.schemaVersion).toBe(TACTIC_SCHEMA_VERSION);
    expect(lifted.stages[0].elements[0].color).toBe("black");
  });

  it("throws when the document does not parse at all", () => {
    expect(() => migrateScene({ nonsense: true })).toThrow(/không đọc được/);
  });
});
