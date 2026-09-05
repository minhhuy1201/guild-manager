import { snapdom } from "@zumer/snapdom";

import { CAPTURE_NODE_ATTRIBUTE } from "../components/formation-capture-sheet";

/** Pixel density of the screenshot — 2 keeps the names readable when Discord scales the image. */
const CAPTURE_SCALE = 2;

/**
 * Rasterise at 1 device pixel per CSS pixel, so the image is `CAPTURE_WIDTH × CAPTURE_SCALE` wide
 * on every machine.
 *
 * snapDOM otherwise multiplies `scale` by the screen's own `devicePixelRatio`, which puts the
 * output — and the payload — at the mercy of whoever presses the button: the same formation came
 * out 2560px wide on a plain monitor and 7680px on a 3x one, and that last one encodes to more
 * base64 than `ANNOUNCEMENT_IMAGE_MAX_CHARS` allows, so the announcement would be refused for the
 * admin's choice of screen. Pinning the width was already the point of the capture sheet; this is
 * the other half of it.
 */
const CAPTURE_DPR = 1;

/** WebP quality. High enough that the grid's borders stay clean, low enough to stay small. */
const CAPTURE_QUALITY = 0.92;

/** The document held a different number of line-ups than the day being announced. */
export class CaptureCountError extends Error {
  constructor(
    /** How many capture nodes the document actually held */
    readonly found: number,
    /** How many the day being announced has */
    readonly expected: number,
  ) {
    super(`Found ${found} capture nodes, expected ${expected}.`);
    this.name = "CaptureCountError";
  }
}

/**
 * The off-screen nodes to screenshot, in match order.
 *
 * Read from the document rather than from refs: the sheet is mounted by the screen while the
 * dialog owns the confirm click, and passing an array of refs between the two only to find the
 * same elements is more moving parts for the same answer. `querySelectorAll` answers in document
 * order, and the sheet renders its matches in order, so the nodes line up with the matches without
 * anything having to sort them.
 *
 * What that reasoning does not survive is a second sheet in the document, or a sheet that has not
 * finished mounting — and then the announcement would go out with a match missing or with images
 * from two different days, to the whole guild, with nothing downstream to catch it. So the count is
 * checked rather than assumed: a mismatch is somebody's bug, and the only safe answer is to refuse.
 *
 * @param expected - How many matches the day being announced holds
 * @returns One element per match, in match order
 * @throws CaptureCountError when the document does not hold exactly that many
 */
export function readCaptureNodes(expected: number): HTMLElement[] {
  const nodes = Array.from(
    document.querySelectorAll<HTMLElement>(`[${CAPTURE_NODE_ATTRIBUTE}]`)
  );

  if (nodes.length !== expected) {
    throw new CaptureCountError(nodes.length, expected);
  }

  return nodes;
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
        dpr: CAPTURE_DPR,
        quality: CAPTURE_QUALITY,
        embedFonts: true,
      })
    )
  );

  return images.map((image) => image.src);
}
