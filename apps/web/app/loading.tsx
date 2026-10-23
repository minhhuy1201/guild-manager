import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shown while a page renders on the server.
 *
 * Every page reads the session cookie, so every route is dynamic, and Next prefetches a dynamic route
 * only up to its nearest `loading.js`. Without this boundary a nav click waited for the whole server
 * render before the page changed at all - a pause users read as a dead click. With it the layout and
 * this shell are prefetched and swap in at once.
 *
 * The shapes follow the common page: the `PageHeader` banner strip, then one content card.
 * @returns The loading shell for any route
 */
export default function Loading() {
  return (
    <div role="status" aria-label="Đang tải trang" className="flex flex-col gap-6">
      <Skeleton className="min-h-24 rounded-container sm:min-h-28 lg:min-h-32" />
      <Skeleton className="h-64 rounded-container" />
    </div>
  );
}
