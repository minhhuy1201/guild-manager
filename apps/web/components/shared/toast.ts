"use client";

import type { CSSProperties } from "react";
import { toast } from "sonner";

/**
 * Accent of each tone. Emerald is the "Có" mark and the destructive red the "Không" one
 * (frontend.md §6), so a toast is coloured by the same vocabulary as the screen that raised it.
 *
 * `--color-green-*` would not work here: Tailwind 4 only emits the palette variables the app
 * actually uses, and nothing in this app is green.
 */
const ACCENT = {
  success: "var(--color-emerald-600)",
  error: "var(--destructive)",
} as const;

/**
 * The three custom properties sonner reads for a toast's surface.
 * A tone is a soft 10% tint of its accent over the page background, with the accent itself as the
 * text and the border — the accent is never used as a fill, so the text stays readable.
 * @param tone - Which accent to build the surface from
 * @returns The style object to hand to a sonner call
 */
function toneStyle(tone: keyof typeof ACCENT): CSSProperties {
  const accent = ACCENT[tone];

  return {
    "--normal-bg": `color-mix(in oklab, ${accent} 10%, var(--background))`,
    "--normal-text": accent,
    "--normal-border": accent,
  } as CSSProperties;
}

/**
 * Report a write that succeeded.
 * @param message - Vietnamese sentence shown in the toast
 * @returns Nothing
 */
export function toastSuccess(message: string): void {
  toast.success(message, { style: toneStyle("success") });
}

/**
 * Report a write that failed.
 * @param message - Vietnamese sentence shown in the toast, usually `ApiError.message`
 * @returns Nothing
 */
export function toastError(message: string): void {
  toast.error(message, { style: toneStyle("error") });
}
