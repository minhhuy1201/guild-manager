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
