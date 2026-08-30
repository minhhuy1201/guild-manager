import { Check, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/** Semantic tone of a status icon. */
export type StatusIconTone = "success" | "danger";

/**
 * SHARED PATTERN: a binary status (yes/no, pass/fail, on/off…) renders as a coloured round icon
 * rather than text — success = green tick, danger = red X. Use this component in every table or card
 * with a status column so the whole app stays consistent.
 *
 * The glyph is a default, not a rule: a domain with a mark of its own passes `icon` and keeps the
 * tone. Attendance does, with the swords of a battle.
 */
const TONE: Record<StatusIconTone, { className: string; Icon: LucideIcon }> = {
  success: { className: "bg-emerald-500 text-white dark:bg-emerald-600", Icon: Check },
  danger: { className: "bg-destructive text-white", Icon: X },
};

interface StatusIconProps {
  /** Semantic tone: success (green tick) / danger (red X). */
  tone: StatusIconTone;
  /** Screen-reader label (required — the icon has no visible text). */
  label: string;
  /** Glyph replacing the tone's default one, for a domain with a mark of its own. */
  icon?: LucideIcon;
  /** Extra classes (e.g. to change the size). */
  className?: string;
}

/**
 * A round icon standing in for a binary status instead of text.
 * @param tone - Semantic tone (success/danger)
 * @param label - Text read by screen readers
 * @param icon - Glyph replacing the tone's default one
 * @param className - Extra classes, merged after the defaults
 * @returns The coloured status icon
 */
export function StatusIcon({
  tone,
  label,
  icon,
  className,
}: StatusIconProps) {
  const { className: toneClass, Icon: defaultIcon } = TONE[tone];
  const Icon = icon ?? defaultIcon;
  return (
    <span
      className={cn(
        "inline-flex size-7 items-center justify-center rounded-full",
        toneClass,
        className
      )}
    >
      <Icon className="size-4" />
      <span className="sr-only">{label}</span>
    </span>
  );
}
