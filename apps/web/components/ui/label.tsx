import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Nhãn cho các trường nhập liệu.
 * @param className - Class bổ sung
 * @returns Phần tử label đã style
 */
function Label({
  className,
  ...props
}: React.ComponentProps<"label">) {
  return (
    <label
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-sm font-medium leading-none select-none",
        className
      )}
      {...props}
    />
  );
}

export { Label };
