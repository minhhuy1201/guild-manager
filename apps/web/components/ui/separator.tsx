import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Đường kẻ phân cách.
 * @param className - Class bổ sung
 * @param orientation - Hướng: ngang (mặc định) hoặc dọc
 * @returns Phần tử phân cách đã style
 */
function Separator({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<"div"> & {
  orientation?: "horizontal" | "vertical";
}) {
  return (
    <div
      data-slot="separator"
      role="separator"
      className={cn(
        "shrink-0 bg-border",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        className
      )}
      {...props}
    />
  );
}

export { Separator };
