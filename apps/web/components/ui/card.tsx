import * as React from "react";

import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Three surface levels. `raised` is for the few blocks that matter most (a lit inner edge and a
 * soft jade glow), `default` is the working card, `inset` is a recessed support block such as a
 * filter strip. Blocks that hold other blocks take the container radius.
 */
const cardVariants = cva(
  "flex flex-col gap-4 rounded-container py-4 text-card-foreground",
  {
    variants: {
      variant: {
        default: "border bg-card shadow-sm",
        raised:
          "border bg-card shadow-[inset_0_1px_0_var(--card-highlight),var(--glow-jade)]",
        inset: "border border-border/60 bg-muted/60 shadow-none",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

function Card({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof cardVariants>) {
  return (
    <div
      data-slot="card"
      data-variant={variant}
      className={cn(cardVariants({ variant }), className)}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn("flex flex-col gap-1 px-4", className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-4", className)}
      {...props}
    />
  );
}

export { Card, CardHeader, CardDescription, CardContent };
