import * as React from "react";

import { cn } from "@/lib/utils";

/** Label for form fields. */
function Label({
  className,
  ...props
}: React.ComponentProps<"label">) {
  return (
    <label
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-base font-medium leading-none select-none",
        className
      )}
      {...props}
    />
  );
}

export { Label };
