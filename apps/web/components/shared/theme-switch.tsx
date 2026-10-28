"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

import { cn } from "@/lib/utils";

const subscribeNever = () => () => {};

const ICON_BASE =
  "col-start-1 row-start-1 size-5 transition-[opacity,rotate,scale] duration-[var(--duration-base)]";
const ICON_ACTIVE = "rotate-0 scale-100 opacity-100 ease-spring";
const ICON_HIDDEN = "pointer-events-none opacity-0 ease-out-soft";

/**
 * The light/dark switch beside the guild's name: one icon button where the sun and the moon share
 * a spot and swap by turning and scaling.
 *
 * next-themes knows the stored theme only in the browser, so the server render and the first client
 * render both draw the light state, and the swap stays off until then - a dark-theme visitor sees
 * the moon already in place instead of watching it spin in on every page load.
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
  const swap = mounted ? "" : "transition-none";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label="Chế độ tối"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="grid size-9 shrink-0 place-items-center rounded-full bg-card ring-1 ring-white/10 ring-inset outline-none hover:bg-foreground/5 max-sm:size-10 focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <Sun
        aria-hidden
        className={cn(
          ICON_BASE,
          swap,
          isDark ? `${ICON_HIDDEN} rotate-90 scale-50` : `${ICON_ACTIVE} text-primary`
        )}
      />
      <Moon
        aria-hidden
        className={cn(
          ICON_BASE,
          swap,
          isDark ? `${ICON_ACTIVE} text-primary` : `${ICON_HIDDEN} -rotate-90 scale-50`
        )}
      />
    </button>
  );
}
