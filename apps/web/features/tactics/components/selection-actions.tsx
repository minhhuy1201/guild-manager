"use client";

import { Trash2 } from "lucide-react";
import {
  TACTIC_TOKEN_SIZES,
  type TacticTokenSize,
} from "@guild/shared/enums";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SelectionPlacement } from "../lib/selection-anchor";

/** Full name of each token size, used as the accessible name of its button. */
const SIZE_LABELS: Record<TacticTokenSize, string> = {
  sm: "Cỡ nhỏ",
  md: "Cỡ vừa",
  lg: "Cỡ lớn",
};

/** What each size button shows. The bar floats on the map, so the word "Cỡ" is left to the label. */
const SIZE_TEXT: Record<TacticTokenSize, string> = {
  sm: "Nhỏ",
  md: "Vừa",
  lg: "Lớn",
};

export interface SelectionActionsProps {
  /** Where the bar sits over the canvas, in CSS pixels */
  placement: SelectionPlacement;
  /** Size of the selected token, or null when the selection is not a token */
  tokenSize: TacticTokenSize | null;
  onTokenSizeChange: (size: TacticTokenSize) => void;
  onDeleteSelected: () => void;
}

/**
 * What the admin can do to the piece they picked up, floating on the map right under it.
 *
 * It sits here rather than in the toolbar because the eye is already on the piece: resizing a
 * token used to mean a trip to the top of the page and back to see what changed. Resizing only
 * means something for a token; deleting means the same for every kind of element.
 *
 * The bar is positioned by its own middle, so it stays centred on the element whatever it is wide,
 * and flips to hang above the element when there is no room underneath.
 * @param props - Where to sit, what is selected, and the callbacks that change it
 * @returns The floating action bar
 */
export function SelectionActions({
  placement,
  tokenSize,
  onTokenSizeChange,
  onDeleteSelected,
}: SelectionActionsProps) {
  return (
    <div
      role="toolbar"
      aria-label="Sửa phần tử đang chọn"
      style={{ left: placement.left, top: placement.top }}
      className={cn(
        "pointer-events-auto absolute z-10 flex -translate-x-1/2 items-center gap-0.5 rounded-lg border bg-card/90 px-1 py-0.5 shadow-md backdrop-blur-sm",
        placement.above && "-translate-y-full"
      )}
    >
      {tokenSize
        ? TACTIC_TOKEN_SIZES.map((candidate) => (
            <Button
              key={candidate}
              type="button"
              size="xs"
              variant={candidate === tokenSize ? "default" : "ghost"}
              aria-pressed={candidate === tokenSize}
              aria-label={SIZE_LABELS[candidate]}
              title={SIZE_LABELS[candidate]}
              onClick={() => onTokenSizeChange(candidate)}
            >
              {SIZE_TEXT[candidate]}
            </Button>
          ))
        : null}
      <Button
        type="button"
        size="icon-xs"
        variant="ghost"
        className="text-destructive"
        aria-label="Xoá phần tử"
        title="Xoá phần tử (Delete)"
        onClick={onDeleteSelected}
      >
        <Trash2 />
      </Button>
    </div>
  );
}
