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

describe("tactic editor store — the rest of the session", () => {
  beforeEach(() => {
    useTacticEditorStore.getState().reset();
  });

  it("keeps the toolbar's own choices", () => {
    const store = useTacticEditorStore.getState();
    store.setTool("freehand");
    store.setColor("yellow");
    store.setStrokeWidth(14);
    store.togglePalette();

    const state = useTacticEditorStore.getState();
    expect(state.tool).toBe("freehand");
    expect(state.color).toBe("yellow");
    expect(state.strokeWidth).toBe(14);
    expect(state.paletteCollapsed).toBe(true);

    useTacticEditorStore.getState().togglePalette();
    expect(useTacticEditorStore.getState().paletteCollapsed).toBe(false);
  });

  it("does nothing at all before a scene is loaded", () => {
    const store = useTacticEditorStore.getState();
    store.commit("s1", [note]);
    store.addStage();
    store.duplicateStage("s1");
    store.renameStage("s1", "Mở màn");
    store.removeStage("s1");
    store.undo();
    store.redo();

    expect(useTacticEditorStore.getState().scene).toBeNull();
    expect(useTacticEditorStore.getState().dirty).toBe(false);
  });

  it("adds a stage, opens it, and duplicates the one asked for", () => {
    useTacticEditorStore.getState().loadScene(scene());
    useTacticEditorStore.getState().addStage();

    let state = useTacticEditorStore.getState();
    expect(state.scene?.stages).toHaveLength(3);
    expect(state.activeStageId).toBe(state.scene?.stages.at(-1)?.id);
    expect(state.dirty).toBe(true);

    useTacticEditorStore.getState().duplicateStage("s1");
    state = useTacticEditorStore.getState();
    expect(state.scene?.stages[1].name).toBe("Giai đoạn 1 (bản sao)");
    expect(state.activeStageId).toBe(state.scene?.stages[1].id);
  });

  it("renames a stage and applies a whole-scene edit", () => {
    useTacticEditorStore.getState().loadScene(scene());
    useTacticEditorStore.getState().renameStage("s1", "Mở màn");
    expect(useTacticEditorStore.getState().scene?.stages[0].name).toBe(
      "Mở màn"
    );

    const edited = {
      schemaVersion: 1 as const,
      stages: [{ id: "only", name: "Một mình", elements: [] }],
    };
    useTacticEditorStore.getState().applySceneEdit(edited);
    expect(useTacticEditorStore.getState().scene).toEqual(edited);
    expect(useTacticEditorStore.getState().dirty).toBe(true);
  });

  it("drops the removed stage's history with it", () => {
    useTacticEditorStore.getState().loadScene(scene());
    useTacticEditorStore.getState().commit("s2", [note]);
    useTacticEditorStore.getState().removeStage("s2");

    const state = useTacticEditorStore.getState();
    expect(state.history.past.s2).toBeUndefined();
    expect(state.scene?.stages).toHaveLength(1);
  });

  it("leaves the last stage alone and stays clean about it", () => {
    useTacticEditorStore
      .getState()
      .loadScene({ schemaVersion: 1, stages: [scene().stages[0]] });
    useTacticEditorStore.getState().removeStage("s1");

    const state = useTacticEditorStore.getState();
    expect(state.scene?.stages).toHaveLength(1);
    expect(state.dirty).toBe(false);
  });

  it("ignores an undo or a redo with an empty stack", () => {
    useTacticEditorStore.getState().loadScene(scene());
    useTacticEditorStore.getState().undo();
    useTacticEditorStore.getState().redo();

    expect(useTacticEditorStore.getState().dirty).toBe(false);
  });

  it("ignores a commit aimed at a stage that is gone", () => {
    useTacticEditorStore.getState().loadScene(scene());
    useTacticEditorStore.getState().commit("khong-ton-tai", [note]);

    expect(useTacticEditorStore.getState().dirty).toBe(false);
  });

  it("clears the selection when the stage changes", () => {
    useTacticEditorStore.getState().loadScene(scene());
    useTacticEditorStore.getState().selectElement("t1");
    useTacticEditorStore.getState().setActiveStage("s2");

    expect(useTacticEditorStore.getState().selectedElementId).toBeNull();
  });
});
