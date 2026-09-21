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
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";
import { useModifierKey } from "../hooks/use-modifier-key";
import { COLOR_HEX, COLOR_LABELS } from "../lib/token-icon";
import {
  ACTION_SHORTCUTS,
  STROKE_WIDTH_SHORTCUT,
  TOOL_SHORTCUTS,
  shortcutLabel,
  type ActionShortcut,
} from "../lib/shortcuts";
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

/**
 * How a key cap is tinted inside a button. `currentColor` rather than the muted pair shadcn ships
 * with: the cap sits on the filled Save button as well as on the ghost ones, and one fixed colour
 * cannot read on both.
 */
const KEY_CAP_CLASS =
  "h-4.5 min-w-4.5 bg-current/12 px-1 text-[10px] text-current";

interface ShortcutKeysProps {
  /** The shortcut to draw */
  shortcut: ActionShortcut;
  /** What the modifier is called on this platform */
  modifier: string;
}

/**
 * A shortcut as a row of key caps, sitting inside the button it belongs to.
 *
 * The caps are `aria-hidden`: the button already carries the whole shortcut in its `title`, and a
 * screen reader spelling out "⇧ Z" on top of that only repeats it.
 * @param shortcut - The shortcut to draw
 * @param modifier - What the modifier is called on this platform
 * @returns The key caps
 */
function ShortcutKeys({ shortcut, modifier }: ShortcutKeysProps) {
  const keys = shortcut.hasModifier
    ? [modifier, ...shortcut.keys]
    : [...shortcut.keys];

  return (
    <KbdGroup aria-hidden className="gap-0.5">
      {keys.map((key, index) => (
        // Position, not the key: a shortcut may press the same key twice.
        <Kbd key={`${index}-${key}`} className={KEY_CAP_CLASS}>
          {key}
        </Kbd>
      ))}
    </KbdGroup>
  );
}

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
 * Every button that answers to a shortcut wears it as a key cap, so the keyboard is readable off
 * the toolbar itself rather than out of a tooltip nobody hovers.
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
  const modifier = useModifierKey();

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border bg-card px-3 py-2 shadow-xs">
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
              <Kbd aria-hidden className={KEY_CAP_CLASS}>
                {TOOL_SHORTCUTS[candidate]}
              </Kbd>
            </Button>
          );
        })}
      </div>

      <div className="h-6 w-px bg-border" aria-hidden />

      <div className="flex items-center gap-1.5">
        {TACTIC_COLORS.map((candidate) => (
          <button
            key={candidate}
            type="button"
            aria-pressed={candidate === color}
            aria-label={COLOR_LABELS[candidate]}
            title={COLOR_LABELS[candidate]}
            className={cn(
              // The ring sits outside the swatch so it reads the same on black as on yellow.
              "size-6 rounded-full ring-offset-2 ring-offset-card transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              candidate === color && "scale-110 ring-2 ring-foreground"
            )}
            style={{ backgroundColor: COLOR_HEX[candidate] }}
            onClick={() => onColorChange(candidate)}
          />
        ))}
      </div>

      <div className="h-6 w-px bg-border" aria-hidden />

      <div className="flex items-center gap-1">
        {TACTIC_STROKE_WIDTHS.map((candidate) => (
          <Button
            key={candidate}
            type="button"
            size="sm"
            variant={candidate === strokeWidth ? "default" : "ghost"}
            aria-pressed={candidate === strokeWidth}
            // "và", not the "+" of a chord: the two keys step the width one way each.
            title={`Nét ${candidate} (${STROKE_WIDTH_SHORTCUT.keys.join(" và ")} để đổi)`}
            className="tabular-nums"
            onClick={() => onStrokeWidthChange(candidate)}
          >
            {candidate}
          </Button>
        ))}
        <ShortcutKeys shortcut={STROKE_WIDTH_SHORTCUT} modifier={modifier} />
      </div>

      {selectedTokenSize ? (
        <div className="flex items-center gap-1 rounded-lg bg-muted/60 p-0.5">
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
          title={`Hoàn tác (${shortcutLabel(ACTION_SHORTCUTS.undo, modifier)})`}
          onClick={onUndo}
        >
          <Undo2 />
          Hoàn tác
          <ShortcutKeys shortcut={ACTION_SHORTCUTS.undo} modifier={modifier} />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!canRedo}
          title={`Làm lại (${shortcutLabel(ACTION_SHORTCUTS.redo, modifier)})`}
          onClick={onRedo}
        >
          <Redo2 />
          Làm lại
          <ShortcutKeys shortcut={ACTION_SHORTCUTS.redo} modifier={modifier} />
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
              title={`Lưu (${shortcutLabel(ACTION_SHORTCUTS.save, modifier)})`}
              onClick={onSave}
            >
              {saving ? <Spinner /> : <Save />}
              {saving ? "Đang lưu..." : "Lưu"}
              <ShortcutKeys
                shortcut={ACTION_SHORTCUTS.save}
                modifier={modifier}
              />
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}
