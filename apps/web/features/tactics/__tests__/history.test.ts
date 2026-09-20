import { describe, expect, it } from "vitest";
import type { TacticElement } from "@guild/shared/schemas";

import {
  HISTORY_LIMIT,
  createHistory,
  pushHistory,
  redoHistory,
  undoHistory,
} from "../lib/history";

/**
 * A note element carrying a given id, so a step is recognisable in an assertion.
 * @param id - Id to give the element
 * @returns The element
 */
function note(id: string): TacticElement {
  return {
    kind: "text",
    id,
    x: 10,
    y: 10,
    text: "Tập kết",
    color: "red",
    fontSize: 24,
  };
}

describe("per-stage history", () => {
  it("undoes and redoes the latest change", () => {
    let history = createHistory();
    history = pushHistory(history, "s1", []);
    history = pushHistory(history, "s1", [note("a")]);

    const undone = undoHistory(history, "s1", [note("b")]);
    expect(undone.elements).toEqual([note("a")]);

    const redone = redoHistory(undone.history, "s1", undone.elements ?? []);
    expect(redone.elements).toEqual([note("b")]);
  });

  it("returns null elements when there is nothing to undo", () => {
    expect(undoHistory(createHistory(), "s1", []).elements).toBeNull();
  });

  it("returns null elements when there is nothing to redo", () => {
    expect(redoHistory(createHistory(), "s1", []).elements).toBeNull();
  });

  it("keeps at most 50 steps, dropping the oldest", () => {
    let history = createHistory();
    for (let step = 0; step <= HISTORY_LIMIT + 5; step += 1) {
      history = pushHistory(history, "s1", [note(`e${step}`)]);
    }

    expect(history.past.s1).toHaveLength(HISTORY_LIMIT);
    expect(history.past.s1[0]).toEqual([note("e6")]);
  });

  it("keeps two stages' stacks apart", () => {
    let history = createHistory();
    history = pushHistory(history, "s1", []);
    history = pushHistory(history, "s2", [note("b")]);

    expect(undoHistory(history, "s1", []).elements).toEqual([]);
    expect(history.past.s2).toHaveLength(1);
  });

  it("drops the redo stack once a new edit is pushed", () => {
    let history = createHistory();
    history = pushHistory(history, "s1", []);
    const undone = undoHistory(history, "s1", [note("a")]);
    const afterEdit = pushHistory(undone.history, "s1", [note("c")]);

    expect(afterEdit.future.s1 ?? []).toHaveLength(0);
  });
});
