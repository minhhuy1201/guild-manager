"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { CACHE_DEPENDENTS, type CacheTopic } from "@/lib/cache-graph";

/**
 * Invalidate mọi query phụ thuộc một chủ đề vừa bị ghi. Chỗ ghi chỉ nói mình
 * vừa đổi cái gì; ai bị ảnh hưởng là việc của `CACHE_DEPENDENTS`.
 * @param topic - Chủ đề dữ liệu vừa thay đổi
 * @returns Hàm dùng trong `onSuccess` của mutation, ổn định qua các lần render
 */
export function useInvalidate(topic: CacheTopic): () => void {
  const queryClient = useQueryClient();

  return useCallback(() => {
    for (const queryKey of CACHE_DEPENDENTS[topic]()) {
      void queryClient.invalidateQueries({ queryKey });
    }
  }, [queryClient, topic]);
}
