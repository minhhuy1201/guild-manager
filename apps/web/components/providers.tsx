"use client";

/**
 * App-wide providers: QueryClientProvider (TanStack Query) and the toast host.
 * Zustand needs no provider — its hooks are used directly.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState, type ReactNode } from "react";

import { Toaster } from "@/components/ui/sonner";
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
      {/*
        Top centre: on a phone the attendance buttons sit at the bottom of the card and a thumb
        covers that half of the screen, so a bottom toast is the one place the confirmation cannot
        be read. `theme="light"` because the app never sets the `.dark` class — without it sonner
        would follow the operating system and drop a dark toast onto a light page.
      */}
      <Toaster position="top-center" theme="light" />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
