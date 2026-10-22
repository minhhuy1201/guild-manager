import type { ReactNode } from "react";
import { Cat } from "lucide-react";

import { cn } from "@/lib/utils";

/** Where the seal sits: the header's brand block, or the login card. */
export type GuildSealSize = "md" | "lg";

/** Frame and glyph size per named size - two fixed values, like `SessionLabel`. */
const SIZE_CLASS: Record<GuildSealSize, string> = {
  md: "size-9 rounded-md [&_svg]:size-5",
  lg: "size-14 rounded-lg [&_svg]:size-8",
};

/** Jade for the guild's own mark; destructive for the stamp on an error. */
export type GuildSealTone = "jade" | "destructive";

/** Literal classes per tone - Tailwind only emits classes it can read in the source. */
const TONE_CLASS: Record<GuildSealTone, string> = {
  jade: "border-jade/50 bg-jade/10 text-jade",
  destructive: "border-destructive/50 bg-destructive/10 text-destructive",
};

interface GuildSealProps {
  /** "md" in the header, "lg" on the login card */
  size?: GuildSealSize;
  /** Colour of the edge and glyph */
  tone?: GuildSealTone;
  /** Glyph inside the seal, the guild's cat by default */
  glyph?: ReactNode;
}

/**
 * The guild's mark: the cat inside a square seal with a thin jade edge - the one place the brand
 * borrows the shape of a Chinese seal stamp. Decorative, so it is hidden from screen readers; the
 * guild name always sits next to it.
 * @param size - Named size of the seal
 * @param tone - Jade, or destructive when the seal stamps an error
 * @param glyph - What sits inside the seal
 * @returns The seal
 */
export function GuildSeal({
  size = "md",
  tone = "jade",
  glyph = <Cat />,
}: GuildSealProps) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center border",
        TONE_CLASS[tone],
        SIZE_CLASS[size]
      )}
    >
      {glyph}
    </span>
  );
}
