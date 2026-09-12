import { cn } from "@/lib/utils";

/** Colour of the diamond: jade under a page title, gold for the login card's one highlight. */
export type OrnamentTone = "jade" | "gold";

/** Where the diamond sits: at the start of a full-width rule, or in the middle of a short one. */
export type OrnamentAlign = "start" | "center";

/** Literal classes per tone - Tailwind only emits classes it can read in the source. */
const TONE_CLASS: Record<OrnamentTone, string> = {
  jade: "bg-jade",
  gold: "bg-gold",
};

interface OrnamentDividerProps {
  /** Colour of the diamond */
  tone?: OrnamentTone;
  /** Position of the diamond on the rule */
  align?: OrnamentAlign;
  /** Extra classes, typically a width for a centred rule */
  className?: string;
}

/**
 * A hairline rule carrying one small diamond - the app's only section ornament, and the whole of its
 * wuxia decoration outside the guild seal. Purely decorative, so hidden from screen readers.
 * @param tone - Colour of the diamond
 * @param align - Whether the diamond opens the rule or sits in its middle
 * @param className - Extra classes merged after the defaults
 * @returns The divider
 */
export function OrnamentDivider({
  tone = "jade",
  align = "start",
  className,
}: OrnamentDividerProps) {
  return (
    <div aria-hidden className={cn("flex items-center gap-2", className)}>
      {align === "center" && <span className="h-px flex-1 bg-border" />}
      <span className={cn("size-1.5 rotate-45", TONE_CLASS[tone])} />
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}
