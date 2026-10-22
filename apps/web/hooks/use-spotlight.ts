"use client";

import type { PointerEvent } from "react";

import { useReducedMotion } from "@/hooks/use-reduced-motion";

/** Pointers that hover; a finger has no hover, so a light following it would only flash. */
const HOVERING_POINTER_TYPES: readonly string[] = ["mouse", "pen"];

/** The pointer handlers a card spreads to carry a spotlight. */
interface SpotlightHandlers {
  onPointerMove?: (event: PointerEvent<HTMLElement>) => void;
  onPointerLeave?: (event: PointerEvent<HTMLElement>) => void;
}

/**
 * Let a card's CSS follow the pointer: writes its position, relative to the card, into `--spot-x`
 * and `--spot-y` on the card itself. Only a mouse or pen drives it, and never under reduced motion.
 * The look (a glowing edge) lives in the stylesheet that reads the two variables.
 * @returns Handlers to spread onto the card; empty when the spotlight is off
 */
export function useSpotlight(): SpotlightHandlers {
  const reducedMotion = useReducedMotion();

  if (reducedMotion) return {};

  return {
    onPointerMove: (event) => {
      if (!HOVERING_POINTER_TYPES.includes(event.pointerType)) return;

      const card = event.currentTarget;
      const box = card.getBoundingClientRect();

      card.style.setProperty("--spot-x", `${event.clientX - box.left}px`);
      card.style.setProperty("--spot-y", `${event.clientY - box.top}px`);
    },
    onPointerLeave: (event) => {
      event.currentTarget.style.removeProperty("--spot-x");
      event.currentTarget.style.removeProperty("--spot-y");
    },
  };
}
