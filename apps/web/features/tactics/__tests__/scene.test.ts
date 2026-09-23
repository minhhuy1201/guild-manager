import { describe, expect, it } from "vitest";
import {
  TACTIC_LIMITS,
  TACTIC_SCHEMA_VERSION,
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
  removeElements,
  removeStage,
  renameStage,
  resizeTokens,
  translateElements,
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
    schemaVersion: TACTIC_SCHEMA_VERSION,
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

  it("duplicates a stage under a copy's name", () => {
    const copy = duplicateStage(sceneWithToken(), "s1").stages[1];

    expect(copy.name).toBe("Giai đoạn 1 (bản sao)");
    expect(copy.elements[0]).toMatchObject({ x: 100, y: 200 });
  });

  it("keeps token ids across a duplicated stage, so the two can be paired", () => {
    const next = duplicateStage(sceneWithToken(), "s1");
    const [original, copy] = next.stages;

    expect(copy.elements[0].id).toBe(original.elements[0].id);
    // The id is shared on purpose; the object is not, so an in-place edit could never reach both.
    expect(copy.elements[0]).not.toBe(original.elements[0]);
  });

  it("still gives a duplicated drawing a fresh id", () => {
    const scene: TacticScene = {
      schemaVersion: TACTIC_SCHEMA_VERSION,
      stages: [
        {
          id: "s1",
          name: "Giai đoạn 1",
          elements: [
            {
              kind: "arrow",
              id: "ar1",
              points: [0, 0, 10, 10],
              color: "red",
              strokeWidth: 4,
            },
          ],
        },
      ],
    };

    const next = duplicateStage(scene, "s1");

    expect(next.stages[1].elements[0].id).not.toBe("ar1");
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

describe("editing several elements at once", () => {
  const arrow = {
    kind: "arrow" as const,
    id: "ar1",
    points: [10, 20, 30, 40],
    color: "blue" as const,
    strokeWidth: 4 as const,
  };
  const freehand = {
    kind: "freehand" as const,
    id: "fh1",
    points: [0, 0, 5, 5, 10, 0],
    color: "black" as const,
    strokeWidth: 2 as const,
  };
  const note = {
    kind: "text" as const,
    id: "tx1",
    x: 50,
    y: 60,
    text: "Tập kết",
    color: "red" as const,
    fontSize: 28,
  };
  const smallToken = { ...token, id: "tk2", size: "sm" as const };
  const busy: TacticStage = {
    id: "s1",
    name: "Giai đoạn 1",
    elements: [token, arrow, freehand, note, smallToken],
  };

  it("moves every kind of element by the same offset", () => {
    const next = translateElements(
      busy,
      ["tk1", "ar1", "fh1", "tx1"],
      100,
      -10
    );

    expect(next.elements[0]).toMatchObject({ x: 200, y: 190 });
    expect(next.elements[1]).toMatchObject({ points: [110, 10, 130, 30] });
    expect(next.elements[2]).toMatchObject({
      points: [100, -10, 105, -5, 110, -10],
    });
    expect(next.elements[3]).toMatchObject({ x: 150, y: 50 });
  });

  it("leaves elements outside the selection as they were, and the input untouched", () => {
    const next = translateElements(busy, ["ar1"], 5, 5);

    expect(next.elements[0]).toBe(token);
    expect(next.elements[4]).toBe(smallToken);
    expect(arrow.points).toEqual([10, 20, 30, 40]);
  });

  it("resizes only the tokens in the selection", () => {
    const next = resizeTokens(busy, ["tk1", "ar1", "tk2"], "lg");

    expect(next.elements[0]).toMatchObject({ size: "lg" });
    expect(next.elements[4]).toMatchObject({ size: "lg" });
    expect(next.elements[1]).toBe(arrow);
  });

  it("removes every selected element", () => {
    expect(
      removeElements(busy, ["tk1", "tx1"]).elements.map(
        (element) => element.id
      )
    ).toEqual(["ar1", "fh1", "tk2"]);
    expect(busy.elements).toHaveLength(5);
  });
});
