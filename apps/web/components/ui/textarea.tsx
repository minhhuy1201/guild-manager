import * as React from "react";

import { cn } from "@/lib/utils";

/** A multi-line input, styled to match the project's `Input`. */
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex w-full min-w-0 rounded-lg border border-border bg-background px-3 py-1 text-sm shadow-xs transition-colors outline-none",
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

export { Textarea };
