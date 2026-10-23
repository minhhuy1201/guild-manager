"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FoughtBattlesFoldProps {
  /** How many fought battles are folded */
  count: number;
  /** What to show on the bar while folded, such as the member's answers; nothing when omitted */
  summary?: ReactNode;
  /** The folded content, rendered only while open */
  children: ReactNode;
}

/**
 * The bar that folds a week's fought battles under the ones still to come. It starts closed on
 * every mount: the page opens on what is left to do, and what is over is one press away.
 * @param count - How many fought battles are folded
 * @param summary - Shown on the bar next to the count
 * @param children - The folded content
 * @returns The bar and, while open, the content under it
 */
export function FoughtBattlesFold({
  count,
  summary,
  children,
}: FoughtBattlesFoldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const contentId = useId();

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-3">
      <Button
        type="button"
        variant="ghost"
        size="lg"
        aria-expanded={isOpen}
        aria-controls={contentId}
        onClick={() => setIsOpen((open) => !open)}
        // `h-auto`: on a phone the answer marks wrap to a second line once a few battles are
        // fought, and a fixed height would let them spill out of the button.
        className="h-auto min-h-11 w-full justify-between py-2"
      >
        <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          <span>Đã đánh · {count} trận</span>
          {summary}
        </span>
        <ChevronDown
          aria-hidden
          className={cn(
            "size-4.5 shrink-0 transition-transform duration-[var(--duration-base)]",
            isOpen && "rotate-180"
          )}
        />
      </Button>
      {isOpen ? <div id={contentId}>{children}</div> : null}
    </div>
  );
}
