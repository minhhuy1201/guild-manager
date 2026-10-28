"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useState, useSyncExternalStore } from "react";

import { cn } from "@/lib/utils";

const subscribeNever = () => () => {};

const ICON_BASE = "col-start-1 row-start-1 size-5";
const ICON_SHOWN = "text-primary";
const ICON_HIDDEN = "pointer-events-none opacity-0";

/**
 * The light/dark switch beside the guild's name: one icon button where the sun and the moon share
 * a spot and swap by turning and scaling.
 *
 * next-themes knows the stored theme only in the browser, so the server render and the first client
 * render both draw the light state. The icons animate only after the first click, so a dark-theme
 * visitor sees the moon already in place instead of watching it spin in on every page load.
 * @returns The switch button
 */
export function ThemeSwitch() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false
  );
  const [hasToggled, setHasToggled] = useState(false);
  const isDark = mounted && resolvedTheme === "dark";
  const enter = hasToggled ? "animate-icon-in" : "";
  const leave = hasToggled ? "animate-icon-out" : "";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label="Chế độ tối"
      onClick={() => {
        setHasToggled(true);
        setTheme(isDark ? "light" : "dark");
      }}
      className="grid size-9 shrink-0 place-items-center rounded-full bg-card ring-1 ring-white/10 ring-inset outline-none hover:bg-foreground/5 max-sm:size-10 focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <Sun
        aria-hidden
        className={cn(
          ICON_BASE,
          isDark ? cn(ICON_HIDDEN, leave) : cn(ICON_SHOWN, enter)
        )}
      />
      <Moon
        aria-hidden
        className={cn(
          ICON_BASE,
          isDark ? cn(ICON_SHOWN, enter) : cn(ICON_HIDDEN, leave)
        )}
      />
    </button>
  );
}
