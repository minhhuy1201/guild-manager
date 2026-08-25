"use client";

/**
 * App-wide providers: QueryClientProvider (TanStack Query).
 * Zustand needs no provider — its hooks are used directly.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState, type ReactNode } from "react";

import { TooltipProvider } from "@/components/ui/tooltip";

/**
 * Wrap the app in every provider it needs.
 * @param children - Children to wrap
 * @returns The configured provider tree
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
