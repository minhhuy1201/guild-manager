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
