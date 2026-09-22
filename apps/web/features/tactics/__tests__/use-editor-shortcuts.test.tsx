// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TACTIC_SCHEMA_VERSION } from "@guild/shared/schemas";

import { useEditorShortcuts } from "../hooks/use-editor-shortcuts";
import { useTacticEditorStore } from "../store/editor-store";

const onSave = vi.fn();
const onDeleteSelected = vi.fn();

/** A component whose only job is to install the shortcuts, next to an open dialog. */
function Harness({ enabled = true }: { enabled?: boolean }) {
  useEditorShortcuts(enabled, onSave, onDeleteSelected);

  return (
    <>
      <input aria-label="ô nhập" />
      <div role="dialog">
        <button type="button">Trong hộp thoại</button>
      </div>
    </>
  );
}

afterEach(cleanup);

beforeEach(() => {
  useTacticEditorStore.getState().reset();
  useTacticEditorStore.getState().loadScene({
    schemaVersion: TACTIC_SCHEMA_VERSION,
    stages: [{ id: "s1", name: "Giai đoạn 1", elements: [] }],
  });
});

/**
 * Press one key on an element.
 * @param key - The key to press
 * @param options - Extra event fields (modifiers, target)
 */
function press(key: string, options: KeyboardEventInit = {}) {
  window.dispatchEvent(
    new KeyboardEvent("keydown", { key, bubbles: true, ...options })
  );
}

describe("useEditorShortcuts", () => {
  it("picks a tool from its digit", () => {
    render(<Harness />);
    press("6");
    expect(useTacticEditorStore.getState().tool).toBe("eraser");

    press("1");
    expect(useTacticEditorStore.getState().tool).toBe("select");
  });

  it("walks the stroke widths with [ and ]", () => {
    render(<Harness />);
    press("]");
    expect(useTacticEditorStore.getState().strokeWidth).toBe(8);

    press("[");
    expect(useTacticEditorStore.getState().strokeWidth).toBe(4);
  });

  it("stops at the widest and the narrowest stroke", () => {
    render(<Harness />);
    for (let step = 0; step < 6; step += 1) press("]");
    expect(useTacticEditorStore.getState().strokeWidth).toBe(14);

    for (let step = 0; step < 6; step += 1) press("[");
    expect(useTacticEditorStore.getState().strokeWidth).toBe(2);
  });

  it("saves on Ctrl+S", () => {
    render(<Harness />);
    press("s", { ctrlKey: true });

    expect(onSave).toHaveBeenCalled();
  });

  it("deletes the selected element on Delete", () => {
    render(<Harness />);
    press("Delete");

    expect(onDeleteSelected).toHaveBeenCalled();
  });

  it("leaves the keyboard alone while a field has focus", () => {
    const { getByLabelText } = render(<Harness />);
    const input = getByLabelText("ô nhập");
    input.focus();
    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "6", bubbles: true })
    );

    expect(useTacticEditorStore.getState().tool).toBe("token");
  });

  it("stands down while the focus is inside a dialog, so the map never changes behind it", () => {
    const { getByRole } = render(<Harness />);
    const button = getByRole("button", { name: "Trong hộp thoại" });

    for (const init of [{ key: "Delete" }, { key: "6" }, { key: "z", ctrlKey: true }]) {
      button.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, ...init }));
    }

    expect(onDeleteSelected).not.toHaveBeenCalled();
    expect(useTacticEditorStore.getState().tool).toBe("token");
  });

  it("installs nothing while the editor is read-only", () => {
    render(<Harness enabled={false} />);
    press("6");

    expect(useTacticEditorStore.getState().tool).toBe("token");
  });
});
