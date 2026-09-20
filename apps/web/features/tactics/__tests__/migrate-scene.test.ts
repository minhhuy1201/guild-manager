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
    expect(() => migrateScene({ ...scene, schemaVersion: 2 })).toThrow(
      /phiên bản mới hơn/
    );
  });

  it("throws when the document does not parse at all", () => {
    expect(() => migrateScene({ nonsense: true })).toThrow(/không đọc được/);
  });
});
