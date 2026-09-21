import type { TacticTool } from "../types/tactic";

/**
 * The key that picks each tool, shown in every tool button's tooltip.
 *
 * Digits rather than initials: the Vietnamese names share their first letters ("Chữ" and "Cơ
 * động"), and a row of digits matches the order the buttons sit in.
 */
export const TOOL_SHORTCUTS: Record<TacticTool, string> = {
  token: "1",
  arrow: "2",
  freehand: "3",
  text: "4",
  eraser: "5",
};

/** The tool each key picks — the reverse of `TOOL_SHORTCUTS`, built once. */
export const TOOL_BY_SHORTCUT: Record<string, TacticTool> = Object.fromEntries(
  Object.entries(TOOL_SHORTCUTS).map(([tool, key]) => [key, tool as TacticTool])
);

/**
 * The tool a key press picks, if any.
 * @param key - `KeyboardEvent.key`
 * @returns The tool, or null when the key picks none
 */
export function toolForKey(key: string): TacticTool | null {
  return TOOL_BY_SHORTCUT[key] ?? null;
}

/** An action of the toolbar that has a keyboard shortcut, as the key badges spell it out. */
export interface ActionShortcut {
  /** Whether the shortcut is held with Ctrl (⌘ on a Mac) */
  readonly hasModifier: boolean;
  /** The keys pressed after the modifier, in the order they are shown */
  readonly keys: readonly string[];
}

/** The toolbar actions that answer to a shortcut, keyed by the button they belong to. */
export const ACTION_SHORTCUTS = {
  undo: { hasModifier: true, keys: ["Z"] },
  redo: { hasModifier: true, keys: ["⇧", "Z"] },
  save: { hasModifier: true, keys: ["S"] },
} as const satisfies Record<string, ActionShortcut>;

/** The two keys that step the stroke width, shown on the width group. */
export const STROKE_WIDTH_SHORTCUT: ActionShortcut = {
  hasModifier: false,
  keys: ["[", "]"],
};

/**
 * A shortcut written out the way a tooltip says it, e.g. "Ctrl + Shift + Z".
 * @param shortcut - The shortcut to spell out
 * @param modifier - What the modifier is called on this platform
 * @returns The shortcut as one line of text
 */
export function shortcutLabel(
  shortcut: ActionShortcut,
  modifier: string
): string {
  const keys = shortcut.keys.map((key) => (key === "⇧" ? "Shift" : key));

  return (shortcut.hasModifier ? [modifier, ...keys] : keys).join(" + ");
}
