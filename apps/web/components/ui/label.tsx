import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * A `<label>` bound to a form control.
 *
 * `htmlFor` is required: a label with nothing to point at is static text, not a label, and
 * `FieldCaption` covers that case.
 */
type LabelProps = React.ComponentProps<"label"> & { htmlFor: string };

/** Label for form fields. */
function Label({ className, htmlFor, ...props }: LabelProps) {
  return (
    <label
      data-slot="label"
      htmlFor={htmlFor}
      className={cn(
        "flex items-center gap-2 text-base font-medium leading-none select-none",
        className
      )}
      {...props}
    />
  );
}

export { Label };
