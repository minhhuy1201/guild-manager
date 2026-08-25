import { Skeleton } from "@/components/ui/skeleton";

/** Number of skeleton rows shown while loading. */
const SKELETON_ROWS = 3;

/**
 * Placeholder shown while the week list and its battles load.
 * @returns Skeleton block matching the settings card's shape
 */
export function SettingsSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-9 w-64" />
      {Array.from({ length: SKELETON_ROWS }, (_, index) => (
        <Skeleton key={index} className="h-20 w-full rounded-lg" />
      ))}
    </div>
  );
}
