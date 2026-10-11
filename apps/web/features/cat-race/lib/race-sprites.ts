/**
 * Pixel-art cat, drawn from text rows so no image asset is needed (spec D20 fallback: no CC0 sprite
 * sheet was used). `#` takes the class colour, the rest are fixed.
 */
const SHARED_ROWS = [
  "..........o.o.",
  "o........o#o#o",
  "oo.ooooooo###o",
  ".o#########w#o",
  ".o#########ppo",
  "..o########oo.",
] as const;

const LEG_ROWS: Record<0 | 1, readonly string[]> = {
  0: ["..o#o....o#o..", "..oo.....oo..."],
  1: ["...o#o..o#o...", "...oo....oo..."],
};

/** Every row of each running frame, top to bottom. */
export const SPRITE_FRAMES: Record<0 | 1, readonly string[]> = {
  0: [...SHARED_ROWS, ...LEG_ROWS[0]],
  1: [...SHARED_ROWS, ...LEG_ROWS[1]],
};

export const SPRITE_COLUMNS = 14;
export const SPRITE_ROWS = SPRITE_FRAMES[0].length;

const OUTLINE = "#2a2433";
const EYE = "#ffffff";
const NOSE = "#ff8fa3";

const cache = new Map<string, HTMLCanvasElement>();

/**
 * Fill colour of one sprite pixel.
 * @param symbol - Character of the sprite row
 * @param body - Class colour for `#`
 * @returns A CSS colour, or null for an empty pixel
 */
function pixelColor(symbol: string, body: string): string | null {
  switch (symbol) {
    case "#":
      return body;
    case "o":
      return OUTLINE;
    case "w":
      return EYE;
    case "p":
      return NOSE;
    default:
      return null;
  }
}

/**
 * A cat sprite, drawn once per colour, size and frame.
 * @param color - Body colour
 * @param sizePx - Width in CSS px
 * @param frame - Which of the two running frames
 * @returns A canvas ready for `drawImage`, scaled for the device pixel ratio
 */
export function catSprite(
  color: string,
  sizePx: number,
  frame: 0 | 1
): HTMLCanvasElement {
  const width = Math.max(1, Math.round(sizePx));
  const key = `${color}|${width}|${frame}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const ratio = window.devicePixelRatio || 1;
  const pixel = (width * ratio) / SPRITE_COLUMNS;
  const sprite = document.createElement("canvas");
  sprite.width = Math.ceil(width * ratio);
  sprite.height = Math.ceil(pixel * SPRITE_ROWS);
  const context = sprite.getContext("2d");
  if (!context) return sprite;

  SPRITE_FRAMES[frame].forEach((row, y) => {
    [...row].forEach((symbol, x) => {
      const fill = pixelColor(symbol, color);
      if (!fill) return;
      context.fillStyle = fill;
      context.fillRect(
        Math.floor(x * pixel),
        Math.floor(y * pixel),
        Math.ceil(pixel),
        Math.ceil(pixel)
      );
    });
  });
  cache.set(key, sprite);

  return sprite;
}
