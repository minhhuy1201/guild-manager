import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

/** Semantic tones for a status badge. */
export type BadgeTone = "success" | "danger" | "muted";

/**
 * Tailwind classes for each tone. Kept here (a shared wrapper) instead of
 * editing the CLI-generated `ui/badge.tsx`. `success` uses emerald because the
 * design system has no green token; `danger` mirrors the `destructive` variant.
 */
const TONE_CLASS: Record<BadgeTone, string> = {
  success: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  danger: "bg-destructive/10 text-destructive dark:bg-destructive/20",
  muted: "bg-muted text-muted-foreground",
};

interface StatusBadgeProps
  extends Omit<React.ComponentProps<typeof Badge>, "variant"> {
  /** Semantic color of the badge. */
  tone: BadgeTone;
}

/**
 * Status badge composing the canonical shadcn `Badge` with a semantic tone.
 * Use this instead of custom `Badge` variants (per project shadcn convention).
 * @param tone - Semantic color (success/danger/muted)
 * @param className - Extra classes merged after the tone classes
 * @param props - Remaining Badge/span props (children, icon...)
 * @returns Styled badge element
 */
export function StatusBadge({ tone, className, ...props }: StatusBadgeProps) {
  return <Badge className={cn(TONE_CLASS[tone], className)} {...props} />;
}
