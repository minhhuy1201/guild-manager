import { Skeleton } from "@/components/ui/skeleton";

/** Number of skeleton rows shown while loading. */
const SKELETON_ROWS = 5;

/**
 * Placeholder rows shown while the member list loads.
 * @returns Skeleton block matching the table's shape
 */
export function MembersSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-9 w-48" />
      </div>
      {Array.from({ length: SKELETON_ROWS }, (_, index) => (
        <Skeleton key={index} className="h-12 w-full rounded-lg" />
      ))}
    </div>
  );
}
