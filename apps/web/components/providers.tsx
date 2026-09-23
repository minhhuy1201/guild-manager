"use client";

/**
 * App-wide providers: the theme (next-themes), QueryClientProvider (TanStack Query) and the toast host.
 * Zustand needs no provider — its hooks are used directly.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ThemeProvider } from "next-themes";
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
    // Light is the default whatever the operating system prefers: the guild picked it as the look
    // of the app, and the night theme is an opt-in from the theme menu. The choice is remembered
    // in localStorage by next-themes, which also sets the `.dark` class before first paint.
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>{children}</TooltipProvider>
        {/*
          Top centre: on a phone the attendance buttons sit at the bottom of the card and a thumb
          covers that half of the screen, so a bottom toast is the one place the confirmation cannot
          be read. No `theme` prop: `components/ui/sonner.tsx` follows the active theme.
        */}
        <Toaster position="top-center" />
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
