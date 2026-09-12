import { Cat } from "lucide-react";

import { cn } from "@/lib/utils";

/** Where the seal sits: the header's brand block, or the login card. */
export type GuildSealSize = "md" | "lg";

/** Frame and glyph size per named size - two fixed values, like `SessionLabel`. */
const SIZE_CLASS: Record<GuildSealSize, string> = {
  md: "size-9 rounded-md [&_svg]:size-5",
  lg: "size-14 rounded-lg [&_svg]:size-8",
};

interface GuildSealProps {
  /** "md" in the header, "lg" on the login card */
  size?: GuildSealSize;
}

/**
 * The guild's mark: the cat inside a square seal with a thin jade edge - the one place the brand
 * borrows the shape of a Chinese seal stamp. Decorative, so it is hidden from screen readers; the
 * guild name always sits next to it.
 * @param size - Named size of the seal
 * @returns The seal
 */
export function GuildSeal({ size = "md" }: GuildSealProps) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center border border-jade/50 bg-jade/10 text-jade",
        SIZE_CLASS[size]
      )}
    >
      <Cat />
    </span>
  );
}
