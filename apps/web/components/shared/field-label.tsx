import type { ReactNode } from "react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

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
    <Label
      className={cn("[&_svg]:size-4 [&_svg]:text-muted-foreground", className)}
      {...props}
    >
      {icon}
      {children}
    </Label>
  );
}
