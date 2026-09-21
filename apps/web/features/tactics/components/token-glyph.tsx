"use client";

import type { TacticTokenIcon } from "@guild/shared/enums";
import { assertNever } from "@guild/shared/lib";

import { cn } from "@/lib/utils";
import { tokenIcon } from "../lib/token-icon";

interface TokenGlyphProps {
  /** Icon key the token carries */
  icon: TacticTokenIcon;
  /** Classes forwarded to whichever glyph is drawn, so both sizes match their button */
  className?: string;
}

/**
 * The artwork of one icon key, outside the canvas: lucide for the drawn icons, the digits
 * themselves for a numbered team. The name always travels as a label or a tooltip on the element
 * around it, so the glyph itself stays out of the accessibility tree.
 * @param icon - Icon key the token carries
 * @param className - Classes forwarded to the glyph
 * @returns The glyph
 */
export function TokenGlyph({ icon, className }: TokenGlyphProps) {
  const art = tokenIcon(icon);

  switch (art.kind) {
    case "lucide":
      return <art.Icon className={className} />;
    case "digits":
      return (
        <span
          aria-hidden
          className={cn(
            "inline-flex size-4 shrink-0 items-center justify-center text-[0.8125rem] leading-none font-semibold tabular-nums",
            className
          )}
        >
          {art.digits}
        </span>
      );
    default:
      return assertNever(art);
  }
}
