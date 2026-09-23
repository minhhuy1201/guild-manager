/** What a click on the map does right now. */
export type TacticTool =
  | "select"
  | "token"
  | "arrow"
  | "freehand"
  | "text"
  | "eraser";

/** Vietnamese name of each tool, shown on the toolbar. */
export const TOOL_LABELS: Record<TacticTool, string> = {
  select: "Chọn",
  token: "Đội hình",
  arrow: "Mũi tên",
  freehand: "Vẽ tự do",
  text: "Chữ",
  eraser: "Tẩy",
};

/**
 * Tools whose press on a placed element picks it up rather than drawing on top of it. Read by the
 * editor's pointer handling and by the canvas's grab cursor, so the two cannot disagree.
 */
export const PICKING_TOOLS: ReadonlySet<TacticTool> = new Set<TacticTool>([
  "select",
  "token",
]);

/** Keys held while the pointer went down on the map. */
export interface PointerModifiers {
  /** Whether Shift was held, which adds to the selection instead of replacing it */
  shift: boolean;
}
