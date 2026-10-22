import { cn } from "@/lib/utils";

/** Colour of the diamond: jade under a page title, gold for the login card's one highlight. */
export type OrnamentTone = "jade" | "gold";

/** Where the diamond sits: at the start of a full-width rule, or in the middle of a short one. */
export type OrnamentAlign = "start" | "center";

/** What the rule is drawn on: the page's own surfaces, or a picture under a scrim. */
export type OrnamentSurface = "page" | "image";

/** Hairline: an even rule. Brush: a stroke that is full at the diamond and thins out into the card. */
export type OrnamentStroke = "hairline" | "brush";

/** Literal classes per tone - Tailwind only emits classes it can read in the source. */
const TONE_CLASS: Record<OrnamentTone, string> = {
  jade: "bg-jade",
  gold: "bg-gold",
};

/** The hairline's colour per surface: the border token on a card, a white veil on a picture. */
const RULE_CLASS: Record<OrnamentSurface, string> = {
  page: "bg-border",
  image: "bg-white/25",
};

/** The brush stroke is a gradient, so its colour is a gradient stop rather than a flat background. */
const BRUSH_CLASS: Record<OrnamentSurface, string> = {
  page: "h-0.5 rounded-full bg-linear-to-r from-jade/50 to-transparent",
  image: "h-0.5 rounded-full bg-linear-to-r from-white/40 to-transparent",
};

interface OrnamentDividerProps {
  /** Colour of the diamond */
  tone?: OrnamentTone;
  /** Position of the diamond on the rule */
  align?: OrnamentAlign;
  /** What the rule is drawn on */
  surface?: OrnamentSurface;
  /** Even hairline, or a brush stroke that thins out (section titles) */
  stroke?: OrnamentStroke;
  /** Extra classes, typically a width for a centred rule */
  className?: string;
}

/**
 * A hairline rule carrying one small diamond - the app's only section ornament. Purely decorative,
 * so hidden from screen readers.
 * @param tone - Colour of the diamond
 * @param align - Whether the diamond opens the rule or sits in its middle
 * @param surface - Whether the rule sits on the page or on a picture
 * @param stroke - Whether the rule is an even hairline or a thinning brush stroke
 * @param className - Extra classes merged after the defaults
 * @returns The divider
 */
export function OrnamentDivider({
  tone = "jade",
  align = "start",
  surface = "page",
  stroke = "hairline",
  className,
}: OrnamentDividerProps) {
  const rule = cn(
    "flex-1",
    stroke === "brush" ? BRUSH_CLASS[surface] : cn("h-px", RULE_CLASS[surface])
  );
  // A brush stroke thins away from the diamond on both sides, so the leading half runs backwards.
  const leadingRule = stroke === "brush" ? cn(rule, "rotate-180") : rule;

  return (
    <div aria-hidden data-stroke={stroke} className={cn("flex items-center gap-2", className)}>
      {align === "center" && <span className={leadingRule} />}
      <span className={cn("size-1.5 rotate-45", TONE_CLASS[tone])} />
      <span className={rule} />
    </div>
  );
}
