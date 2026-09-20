import { beforeEach, describe, expect, it } from "vitest";
import type { TacticElement, TacticScene } from "@guild/shared/schemas";

import { useTacticEditorStore } from "../store/editor-store";

/**
 * A two-stage scene, rebuilt per test so one test's edits cannot leak into the next.
 * @returns The scene
 */
function scene(): TacticScene {
  return {
    schemaVersion: 1,
    stages: [
      { id: "s1", name: "Giai đoạn 1", elements: [] },
      { id: "s2", name: "Giai đoạn 2", elements: [] },
    ],
  };
}

const note: TacticElement = {
  kind: "text",
  id: "t1",
  x: 1,
  y: 1,
  text: "Tập kết",
  color: "red",
  fontSize: 24,
};

describe("tactic editor store", () => {
  beforeEach(() => {
    useTacticEditorStore.getState().reset();
  });

  it("loads a scene clean, landing on the first stage", () => {
    useTacticEditorStore.getState().loadScene(scene());

    const state = useTacticEditorStore.getState();
    expect(state.activeStageId).toBe("s1");
    expect(state.dirty).toBe(false);
  });

  it("marks the scene dirty on a commit and clean again after a save", () => {
    useTacticEditorStore.getState().loadScene(scene());
    useTacticEditorStore.getState().commit("s1", [note]);

    expect(useTacticEditorStore.getState().dirty).toBe(true);

    useTacticEditorStore.getState().markSaved();
    expect(useTacticEditorStore.getState().dirty).toBe(false);
  });

  it("undoes a commit back to the previous elements, then redoes it", () => {
    useTacticEditorStore.getState().loadScene(scene());
    useTacticEditorStore.getState().commit("s1", [note]);
    useTacticEditorStore.getState().undo();

    expect(useTacticEditorStore.getState().scene?.stages[0].elements).toEqual(
      []
    );

    useTacticEditorStore.getState().redo();
    expect(useTacticEditorStore.getState().scene?.stages[0].elements).toEqual([
      note,
    ]);
  });

  it("keeps each stage's undo stack to itself", () => {
    useTacticEditorStore.getState().loadScene(scene());
    useTacticEditorStore.getState().commit("s1", [note]);
    useTacticEditorStore.getState().setActiveStage("s2");
    useTacticEditorStore.getState().undo();

    expect(useTacticEditorStore.getState().scene?.stages[0].elements).toEqual([
      note,
    ]);
  });

  it("keeps stage operations out of the undo stack", () => {
    useTacticEditorStore.getState().loadScene(scene());
    useTacticEditorStore.getState().removeStage("s2");
    useTacticEditorStore.getState().undo();

    expect(useTacticEditorStore.getState().scene?.stages).toHaveLength(1);
  });

  it("follows the active stage when the open one is removed", () => {
    useTacticEditorStore.getState().loadScene(scene());
    useTacticEditorStore.getState().removeStage("s1");

    expect(useTacticEditorStore.getState().activeStageId).toBe("s2");
  });

  it("drops the selection when the tool changes", () => {
    useTacticEditorStore.getState().loadScene(scene());
    useTacticEditorStore.getState().selectElement("t1");
    useTacticEditorStore.getState().setTool("eraser");

    expect(useTacticEditorStore.getState().selectedElementId).toBeNull();
  });
});
