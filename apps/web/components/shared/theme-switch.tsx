"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

import { cn } from "@/lib/utils";

const subscribeNever = () => () => {};

/**
 * The light/dark switch beside the guild's name: a pill with a sun and a moon, the thumb resting
 * under the active one.
 *
 * next-themes knows the stored theme only in the browser, so the server render and the first client
 * render both draw the light state, and the thumb's slide stays off until then - a dark-theme
 * visitor sees the thumb already in place instead of gliding across on every page load.
 * @returns The switch button
 */
export function ThemeSwitch() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false
  );
  const isDark = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label="Chế độ tối"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="group relative grid h-9 w-14 shrink-0 grid-cols-2 place-items-center rounded-full ring-1 ring-white/10 ring-inset bg-card p-1 outline-none hover:bg-foreground/5 max-sm:h-10 focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-0 left-1 my-auto size-6 rounded-full bg-primary shadow-sm",
          mounted && "transition-transform duration-[var(--duration-base)] ease-out-soft",
          isDark && "translate-x-6"
        )}
      />
      <Sun
        aria-hidden
        className={cn(
          "relative size-4 transition-colors duration-[var(--duration-fast)] ease-out-soft",
          isDark ? "text-muted-foreground" : "text-primary-foreground"
        )}
      />
      <Moon
        aria-hidden
        className={cn(
          "relative size-4 transition-colors duration-[var(--duration-fast)] ease-out-soft",
          isDark ? "text-primary-foreground" : "text-muted-foreground"
        )}
      />
    </button>
  );
}
