"use client";

import { useEffect } from "react";
import { TACTIC_STROKE_WIDTHS } from "@guild/shared/enums";

import { toolForKey } from "../lib/shortcuts";
import { useTacticEditorStore } from "../store/editor-store";

/**
 * Whether the keyboard belongs to a field the admin is typing in.
 * @param target - What the key event came from
 * @returns True when the key should be left to that field
 */
function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA"
  );
}

/**
 * The editor's keyboard: tools on 1-5, stroke width on [ and ], Delete for the selected element,
 * Ctrl+Z / Ctrl+Shift+Z for history and Ctrl+S to save.
 *
 * Every shortcut is off while the focus sits in a field, so renaming a stage never changes a tool.
 * @param enabled - Whether the editor is on screen and writable
 * @param onSave - Called by Ctrl+S
 * @param onDeleteSelected - Called by Delete or Backspace with an element selected
 */
export function useEditorShortcuts(
  enabled: boolean,
  onSave: () => void,
  onDeleteSelected: () => void
): void {
  const setTool = useTacticEditorStore((state) => state.setTool);
  const setStrokeWidth = useTacticEditorStore((state) => state.setStrokeWidth);
  const undo = useTacticEditorStore((state) => state.undo);
  const redo = useTacticEditorStore((state) => state.redo);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    /**
     * Handle one key press.
     * @param event - The keyboard event
     */
    function handleKeyDown(event: KeyboardEvent) {
      if (isTyping(event.target)) {
        return;
      }

      if (event.ctrlKey || event.metaKey) {
        const key = event.key.toLowerCase();

        if (key === "s") {
          event.preventDefault();
          onSave();
        } else if (key === "z") {
          event.preventDefault();
          if (event.shiftKey) redo();
          else undo();
        }

        return;
      }

      const tool = toolForKey(event.key);

      if (tool) {
        event.preventDefault();
        setTool(tool);
        return;
      }

      if (event.key === "[" || event.key === "]") {
        event.preventDefault();
        const current = useTacticEditorStore.getState().strokeWidth;
        const index = TACTIC_STROKE_WIDTHS.indexOf(current);
        const next = event.key === "[" ? index - 1 : index + 1;

        setStrokeWidth(
          TACTIC_STROKE_WIDTHS[
            Math.min(TACTIC_STROKE_WIDTHS.length - 1, Math.max(0, next))
          ]
        );
        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        onDeleteSelected();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, onSave, onDeleteSelected, setTool, setStrokeWidth, undo, redo]);
}
