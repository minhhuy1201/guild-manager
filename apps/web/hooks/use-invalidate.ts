"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { CACHE_DEPENDENTS, type CacheTopic } from "@/lib/cache-graph";

/**
 * Invalidate every query depending on a topic that was just written. The writer only states what it
 * changed; who is affected is `CACHE_DEPENDENTS`'s business.
 * @param topic - Data topic that just changed
 * @returns A function for a mutation's `onSuccess`, stable across renders
 */
export function useInvalidate(topic: CacheTopic): () => void {
  const queryClient = useQueryClient();

  return useCallback(() => {
    for (const queryKey of CACHE_DEPENDENTS[topic]()) {
      void queryClient.invalidateQueries({ queryKey });
    }
  }, [queryClient, topic]);
}
