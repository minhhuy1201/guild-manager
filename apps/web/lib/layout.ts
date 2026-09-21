/**
 * How wide the app shell may grow.
 *
 * The header, the page column and the footer all read this one constant, so the three can never
 * drift apart — a mismatch shows up as a header whose edges miss the content under it.
 * 1920px rather than the old 1600: the tactics board draws a 1920-wide map, and on a 27-inch screen
 * the extra 320px is the difference between reading the map and squinting at it.
 */
export const APP_SHELL_WIDTH = "max-w-[1920px]";

/** The shell's width in pixels, for the `sizes` hint of a full-width image. */
export const APP_SHELL_WIDTH_PX = 1920;
