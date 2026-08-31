"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { CACHE_DEPENDENTS, type CacheTopic } from "@/lib/cache-graph";

/**
 * Invalidate every query depending on a topic that was just written. The writer only states what it
 * changed; who is affected is `CACHE_DEPENDENTS`'s business.
 *
 * The returned promise settles only once every dependent query has refetched. A mutation's
 * `onSuccess` returns it, so the mutation stays pending across the refetch as well as the write —
 * without that the caller tears its spinner down the moment the POST answers and the screen sits on
 * stale cache for one more round-trip, showing the old row with nothing saying it is still working.
 * @param topic - Data topic that just changed
 * @returns A function for a mutation's `onSuccess`, stable across renders
 */
export function useInvalidate(topic: CacheTopic): () => Promise<void> {
  const queryClient = useQueryClient();

  return useCallback(async () => {
    await Promise.all(
      CACHE_DEPENDENTS[topic]().map((queryKey) =>
        queryClient.invalidateQueries({ queryKey })
      )
    );
  }, [queryClient, topic]);
}
