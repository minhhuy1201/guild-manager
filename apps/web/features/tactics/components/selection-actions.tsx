"use client";

import { Trash2 } from "lucide-react";
import {
  TACTIC_TOKEN_SIZES,
  type TacticTokenSize,
} from "@guild/shared/enums";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SelectionPlacement } from "../lib/selection-anchor";
import { TOKEN_SIZE_LABELS, TOKEN_SIZE_TEXT } from "../lib/token-icon";

export interface SelectionActionsProps {
  /** Where the bar sits over the canvas, in CSS pixels */
  placement: SelectionPlacement;
  /** Size of every selected token; empty when the selection holds none */
  tokenSizes: readonly TacticTokenSize[];
  onTokenSizeChange: (size: TacticTokenSize) => void;
  onDeleteSelected: () => void;
}

/**
 * What the admin can do to the piece they picked up, floating on the map right under it.
 *
 * It sits here rather than in the toolbar because the eye is already on the piece: resizing a
 * token used to mean a trip to the top of the page and back to see what changed. Resizing only
 * means something for a token; deleting means the same for every kind of element. Both act on the
 * whole selection, however many elements the marquee took in.
 *
 * The bar is positioned by its own middle, so it stays centred on the element whatever it is wide,
 * and flips to hang above the element when there is no room underneath.
 * @param props - Where to sit, what is selected, and the callbacks that change it
 * @returns The floating action bar
 */
export function SelectionActions({
  placement,
  tokenSizes,
  onTokenSizeChange,
  onDeleteSelected,
}: SelectionActionsProps) {
  // A size reads as the selection's only while every token wears it; a mixed selection presses none.
  const sharedSize = tokenSizes.every((size) => size === tokenSizes[0])
    ? (tokenSizes[0] ?? null)
    : null;

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
      {tokenSizes.length > 0
        ? TACTIC_TOKEN_SIZES.map((candidate) => (
            <Button
              key={candidate}
              type="button"
              size="xs"
              variant={candidate === sharedSize ? "default" : "ghost"}
              aria-pressed={candidate === sharedSize}
              aria-label={TOKEN_SIZE_LABELS[candidate]}
              title={TOKEN_SIZE_LABELS[candidate]}
              onClick={() => onTokenSizeChange(candidate)}
            >
              {TOKEN_SIZE_TEXT[candidate]}
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
