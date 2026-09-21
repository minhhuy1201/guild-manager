"use client";

import {
  Eraser,
  MoveUpRight,
  Pencil,
  Redo2,
  Save,
  Image as ImageIcon,
  Type,
  Undo2,
  Users,
} from "lucide-react";
import {
  TACTIC_COLORS,
  TACTIC_STROKE_WIDTHS,
  TACTIC_TOKEN_SIZES,
  type TacticColor,
  type TacticStrokeWidth,
  type TacticTokenSize,
} from "@guild/shared/enums";

import { Spinner } from "@/components/shared/spinner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { COLOR_HEX, COLOR_LABELS } from "../lib/token-icon";
import { TOOL_SHORTCUTS } from "../lib/shortcuts";
import { TOOL_LABELS, type TacticTool } from "../types/tactic";

/** Icon of each tool, in the order the toolbar shows them. */
const TOOL_ICONS: Record<TacticTool, typeof Users> = {
  token: Users,
  arrow: MoveUpRight,
  freehand: Pencil,
  text: Type,
  eraser: Eraser,
};

/** Vietnamese name of each token size, used on the three size buttons. */
const SIZE_LABELS: Record<TacticTokenSize, string> = {
  sm: "Cỡ nhỏ",
  md: "Cỡ vừa",
  lg: "Cỡ lớn",
};

export interface EditorToolbarProps {
  /** Tool a click on the map uses */
  tool: TacticTool;
  /** Colour every new element takes */
  color: TacticColor;
  /** Width every new stroke takes */
  strokeWidth: TacticStrokeWidth;
  /** Size of the selected token, or null when nothing is selected */
  selectedTokenSize: TacticTokenSize | null;
  /** Whether there is an edit to take back */
  canUndo: boolean;
  /** Whether there is an edit to put back */
  canRedo: boolean;
  /** Whether a save is in flight */
  saving: boolean;
  /** Whether the draft holds unsaved edits */
  dirty: boolean;
  /** Whether the viewer may write — a member gets the toolbar read-only, with no export */
  isAdmin: boolean;
  onToolChange: (tool: TacticTool) => void;
  onColorChange: (color: TacticColor) => void;
  onStrokeWidthChange: (strokeWidth: TacticStrokeWidth) => void;
  onTokenSizeChange: (size: TacticTokenSize) => void;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onExport: () => void;
}

/**
 * The editor's toolbar: tools, colours, stroke widths, undo/redo, save and export.
 * Every button carries its keyboard shortcut in the `title`, so the shortcuts are discoverable
 * without a separate legend.
 * @param props - The current tool state and the callbacks that change it
 * @returns The toolbar
 */
export function EditorToolbar({
  tool,
  color,
  strokeWidth,
  selectedTokenSize,
  canUndo,
  canRedo,
  saving,
  dirty,
  isAdmin,
  onToolChange,
  onColorChange,
  onStrokeWidthChange,
  onTokenSizeChange,
  onUndo,
  onRedo,
  onSave,
  onExport,
}: EditorToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border bg-card px-3 py-2">
      <div className="flex items-center gap-1">
        {(Object.keys(TOOL_LABELS) as TacticTool[]).map((candidate) => {
          const Icon = TOOL_ICONS[candidate];

          return (
            <Button
              key={candidate}
              type="button"
              size="sm"
              variant={candidate === tool ? "default" : "ghost"}
              aria-pressed={candidate === tool}
              title={`${TOOL_LABELS[candidate]} (${TOOL_SHORTCUTS[candidate]})`}
              onClick={() => onToolChange(candidate)}
            >
              <Icon />
              {TOOL_LABELS[candidate]}
            </Button>
          );
        })}
      </div>

      <div className="flex items-center gap-1">
        {TACTIC_COLORS.map((candidate) => (
          <button
            key={candidate}
            type="button"
            aria-pressed={candidate === color}
            aria-label={COLOR_LABELS[candidate]}
            title={COLOR_LABELS[candidate]}
            className={cn(
              "size-6 rounded-full border-2",
              candidate === color ? "border-foreground" : "border-transparent"
            )}
            style={{ backgroundColor: COLOR_HEX[candidate] }}
            onClick={() => onColorChange(candidate)}
          />
        ))}
      </div>

      <div className="flex items-center gap-1">
        {TACTIC_STROKE_WIDTHS.map((candidate) => (
          <Button
            key={candidate}
            type="button"
            size="sm"
            variant={candidate === strokeWidth ? "default" : "ghost"}
            aria-pressed={candidate === strokeWidth}
            title={`Nét ${candidate} ([ và ] để đổi)`}
            onClick={() => onStrokeWidthChange(candidate)}
          >
            {candidate}
          </Button>
        ))}
      </div>

      {selectedTokenSize ? (
        <div className="flex items-center gap-1">
          {TACTIC_TOKEN_SIZES.map((candidate) => (
            <Button
              key={candidate}
              type="button"
              size="sm"
              variant={candidate === selectedTokenSize ? "default" : "ghost"}
              aria-pressed={candidate === selectedTokenSize}
              onClick={() => onTokenSizeChange(candidate)}
            >
              {SIZE_LABELS[candidate]}
            </Button>
          ))}
        </div>
      ) : null}

      <div className="ml-auto flex items-center gap-1">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!canUndo}
          title="Hoàn tác (Ctrl+Z)"
          onClick={onUndo}
        >
          <Undo2 />
          Hoàn tác
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!canRedo}
          title="Làm lại (Ctrl+Shift+Z)"
          onClick={onRedo}
        >
          <Redo2 />
          Làm lại
        </Button>

        {isAdmin ? (
          <>
            <Button
              type="button"
              size="sm"
              variant="outline"
              title="Xuất ảnh"
              onClick={onExport}
            >
              <ImageIcon />
              Xuất ảnh
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={saving || !dirty}
              title="Lưu (Ctrl+S)"
              onClick={onSave}
            >
              {saving ? <Spinner /> : <Save />}
              {saving ? "Đang lưu..." : "Lưu"}
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}
