import type { ReactNode } from "react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** Icon sizing and colour shared by every field heading, label or caption alike. */
const FIELD_ICON_CLASSES = "[&_svg]:size-4 [&_svg]:text-muted-foreground";

interface FieldLabelProps extends React.ComponentProps<typeof Label> {
  /** Icon shown before the text — a lucide element, sized and coloured here. */
  icon: ReactNode;
}

/**
 * SHARED PATTERN: a form field label with its icon in front.
 *
 * The icon is styled through the label rather than at each call site, so every form on the app
 * shows the same size and colour without repeating the classes.
 * @param icon - Icon shown before the text
 * @param className - Extra classes merged after the icon styling
 * @param children - The label text
 * @param props - Remaining label props, `htmlFor` above all
 * @returns The label with its icon
 */
export function FieldLabel({
  icon,
  className,
  children,
  ...props
}: FieldLabelProps) {
  return (
    <Label className={cn(FIELD_ICON_CLASSES, className)} {...props}>
      {icon}
      {children}
    </Label>
  );
}

interface FieldCaptionProps extends React.ComponentProps<"span"> {
  /** Icon shown before the text — a lucide element, sized and coloured here. */
  icon: ReactNode;
}

/**
 * SHARED PATTERN: the heading of a read-only field, styled like `FieldLabel`.
 *
 * A `<label>` must point at a control; a field the user cannot edit has none, so this renders a
 * `<span>` instead of falsely announcing a control to a screen reader.
 * @param icon - Icon shown before the text
 * @param className - Extra classes merged after the icon styling
 * @param children - The heading text
 * @param props - Remaining span props
 * @returns The heading with its icon
 */
export function FieldCaption({
  icon,
  className,
  children,
  ...props
}: FieldCaptionProps) {
  return (
    <span
      className={cn(
        "flex items-center gap-2 text-base font-medium leading-none select-none",
        FIELD_ICON_CLASSES,
        className
      )}
      {...props}
    >
      {icon}
      {children}
    </span>
  );
}
