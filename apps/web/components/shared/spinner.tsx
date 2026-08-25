import { LoaderCircle } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * The two sizes a spinner may take. Named values rather than a free `className`,
 * same reasoning as `SessionLabel` — a third size means adding it here.
 */
const SIZE_CLASS = {
  sm: "size-3.5",
  md: "size-4",
} as const;

interface SpinnerProps {
  /** "sm" inside a row action or a table cell, "md" (the default) inside a button. */
  size?: keyof typeof SIZE_CLASS;
  /**
   * Screen reader label. Leave it out where the spinner sits inside a control that
   * already names itself — a button with visible text, or `RowActionButton`, which
   * adds its own `sr-only` label. A second one there only duplicates the name.
   */
  label?: string;
}

/**
 * The app's only spinner. Renders a fragment (icon + optional screen reader text)
 * so it drops straight into a button's flex row without an extra wrapper.
 * @param size - Icon size, "md" by default
 * @param label - Screen reader label; omitted when the surrounding control has a name
 * @returns The spinning icon, plus its screen reader text when a label is given
 */
export function Spinner({ size = "md", label }: SpinnerProps) {
  return (
    <>
      <LoaderCircle
        aria-hidden
        className={cn("animate-spin", SIZE_CLASS[size])}
      />
      {label && <span className="sr-only">{label}</span>}
    </>
  );
}
