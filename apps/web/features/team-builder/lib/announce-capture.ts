import { snapdom } from "@zumer/snapdom";

import { CAPTURE_NODE_ATTRIBUTE } from "../components/formation-capture-sheet";

/** Pixel density of the screenshot — 2 keeps the names readable when Discord scales the image. */
const CAPTURE_SCALE = 2;

/** WebP quality. High enough that the grid's borders stay clean, low enough to stay small. */
const CAPTURE_QUALITY = 0.92;

/**
 * The off-screen nodes to screenshot, in match order.
 *
 * Read from the document rather than from refs: the sheet is mounted by the screen while the
 * dialog owns the confirm click, and passing an array of refs between the two only to find the
 * same elements is more moving parts for the same answer.
 *
 * @returns One element per match currently laid out
 */
export function readCaptureNodes(): HTMLElement[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>(`[${CAPTURE_NODE_ATTRIBUTE}]`)
  );
}

/**
 * Screenshot each line-up into a webp data URL.
 *
 * Fonts are embedded because the image is read on somebody else's machine: without them Discord
 * shows the grid in a fallback face, with every name a different width.
 *
 * @param nodes - Elements to capture, in match order
 * @returns One `data:image/webp;base64,…` per node, in the same order
 * @throws Error when the browser cannot rasterise a node
 */
export async function captureFormations(
  nodes: HTMLElement[]
): Promise<string[]> {
  const images = await Promise.all(
    nodes.map((node) =>
      snapdom.toWebp(node, {
        scale: CAPTURE_SCALE,
        quality: CAPTURE_QUALITY,
        embedFonts: true,
      })
    )
  );

  return images.map((image) => image.src);
}
