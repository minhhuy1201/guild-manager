import { describe, expect, it } from "vitest";
import {
  TACTIC_LIMITS,
  type TacticScene,
  type TacticStage,
} from "@guild/shared/schemas";

import {
  addElement,
  addStage,
  isStageFull,
  duplicateStage,
  moveToken,
  removeElement,
  removeStage,
  renameStage,
  resizeToken,
} from "../lib/scene";

const token = {
  kind: "token" as const,
  id: "tk1",
  label: "Đội công",
  icon: "swords" as const,
  x: 100,
  y: 200,
  size: "md" as const,
  color: "red" as const,
};

/**
 * A one-stage scene holding the token above.
 * @returns A fresh scene, so one test's edits cannot leak into the next
 */
function sceneWithToken(): TacticScene {
  return {
    schemaVersion: 1,
    stages: [{ id: "s1", name: "Giai đoạn 1", elements: [token] }],
  };
}

const stage: TacticStage = { id: "s1", name: "Giai đoạn 1", elements: [token] };

describe("scene edits", () => {
  it("adds an element without touching the original stage", () => {
    const next = addElement(stage, { ...token, id: "tk2" });

    expect(next.elements).toHaveLength(2);
    expect(stage.elements).toHaveLength(1);
    expect(next).not.toBe(stage);
  });

  it("removes an element by id", () => {
    expect(removeElement(stage, "tk1").elements).toEqual([]);
    expect(stage.elements).toHaveLength(1);
  });

  it("leaves the stage alone when the id is not on it", () => {
    expect(removeElement(stage, "nope").elements).toHaveLength(1);
  });

  it("moves a token to new coordinates, leaving the old object intact", () => {
    const next = moveToken(stage, "tk1", 300, 400);

    expect(next.elements[0]).toMatchObject({ x: 300, y: 400 });
    expect(token.x).toBe(100);
  });

  it("resizes a token", () => {
    expect(resizeToken(stage, "tk1", "lg").elements[0]).toMatchObject({
      size: "lg",
    });
  });

  it("appends a stage with a generated name", () => {
    expect(addStage(sceneWithToken()).stages.at(-1)?.name).toBe("Giai đoạn 2");
  });

  it("refuses to append past the twentieth stage", () => {
    let scene = sceneWithToken();
    for (let index = 0; index < 25; index += 1) {
      scene = addStage(scene);
    }

    expect(scene.stages).toHaveLength(20);
  });

  it("duplicates a stage with fresh element ids", () => {
    const copy = duplicateStage(sceneWithToken(), "s1").stages[1];

    expect(copy.name).toBe("Giai đoạn 1 (bản sao)");
    expect(copy.elements[0].id).not.toBe("tk1");
    expect(copy.elements[0]).toMatchObject({ x: 100, y: 200 });
  });

  it("renames a stage", () => {
    expect(renameStage(sceneWithToken(), "s1", "Mở màn").stages[0].name).toBe(
      "Mở màn"
    );
  });

  it("refuses to remove the last stage", () => {
    expect(removeStage(sceneWithToken(), "s1").stages).toHaveLength(1);
  });

  it("removes a stage once there is more than one", () => {
    const scene = addStage(sceneWithToken());

    expect(removeStage(scene, "s1").stages).toHaveLength(1);
    expect(removeStage(scene, "s1").stages[0].name).toBe("Giai đoạn 2");
  });
});

describe("per-stage element ceiling", () => {
  it("reports a stage as full at 400 elements", () => {
    const full: TacticStage = {
      id: "s1",
      name: "Giai đoạn 1",
      elements: Array.from({ length: TACTIC_LIMITS.elementsPerStage }, (_, index) => ({
        ...token,
        id: `tk${index}`,
      })),
    };

    expect(isStageFull(full)).toBe(true);
    expect(isStageFull(stage)).toBe(false);
  });

  it("refuses the 401st element instead of growing past the contract", () => {
    const full: TacticStage = {
      id: "s1",
      name: "Giai đoạn 1",
      elements: Array.from({ length: TACTIC_LIMITS.elementsPerStage }, (_, index) => ({
        ...token,
        id: `tk${index}`,
      })),
    };

    const next = addElement(full, { ...token, id: "one-too-many" });

    expect(next).toBe(full);
    expect(next.elements).toHaveLength(TACTIC_LIMITS.elementsPerStage);
  });
});
