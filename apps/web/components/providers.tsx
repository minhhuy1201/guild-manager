"use client";

/**
 * Provider tổng cho toàn bộ ứng dụng.
 * Bao gồm QueryClientProvider (TanStack Query).
 * Zustand không cần provider — dùng trực tiếp qua hook.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState, type ReactNode } from "react";

import { TooltipProvider } from "@/components/ui/tooltip";

/**
 * Wrap toàn bộ app với các provider cần thiết
 * @param children - Các component con cần wrap
 * @returns JSX Element với các provider đã được cấu hình
 */
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>{children}</TooltipProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
