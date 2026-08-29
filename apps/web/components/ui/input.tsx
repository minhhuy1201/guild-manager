import * as React from "react";

import { cn } from "@/lib/utils";

/** The base input, styled with the project's design tokens. */
function Input({
  className,
  type,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-11 w-full min-w-0 rounded-lg border border-border bg-card px-3.5 py-2 text-base shadow-xs transition-colors outline-none",
        "placeholder:text-muted-foreground",
        "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        "disabled:pointer-events-none disabled:opacity-50",
        "dark:bg-input/30",
        className
      )}
      {...props}
    />
  );
}

export { Input };
