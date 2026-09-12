import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "animate-shimmer rounded-md bg-muted bg-linear-to-r from-transparent via-card/80 to-transparent bg-[length:200%_100%] bg-no-repeat",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
