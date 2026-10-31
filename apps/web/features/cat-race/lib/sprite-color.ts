/** Share of each channel the stripes keep: 28% darker than the body. */
const STRIPE_SHADE = 0.72;
const HEX_RADIX = 16;
const BYTE = 255;
const RED_SHIFT = 16;
const GREEN_SHIFT = 8;

/** Colour of every sprite letter that does not depend on the class. */
const FIXED_COLORS: Readonly<Record<string, string>> = {
  o: "#221a26",
  w: "#ffffff",
  p: "#ff8fa3",
  c: "#8ff0ff",
  r: "#e0362c",
  g: "#f2c14e",
  y: "#d9b26a",
  s: "#a8b0ba",
  m: "#f6efc4",
  f: "#fff4c0",
  h: "#f4e89e",
};

/** The crown's gold is the horn's gold. */
export const CROWN_GOLD = FIXED_COLORS.g;

/**
 * A darker shade of a colour.
 * @param hex - `#rrggbb`
 * @returns `#rrggbb` with every channel scaled by `STRIPE_SHADE`
 */
export function darker(hex: string): string {
  const value = parseInt(hex.slice(1), HEX_RADIX);
  const channel = (part: number) =>
    Math.round(part * STRIPE_SHADE)
      .toString(HEX_RADIX)
      .padStart(2, "0");

  return `#${channel(value >> RED_SHIFT)}${channel((value >> GREEN_SHIFT) & BYTE)}${channel(value & BYTE)}`;
}

/**
 * Fill colour of one sprite pixel.
 * @param symbol - Character of the sprite row
 * @param body - Class colour for `#`
 * @returns A CSS colour, or null for an empty pixel
 */
export function pixelColor(symbol: string, body: string): string | null {
  if (symbol === "#") return body;
  if (symbol === "d") return darker(body);

  return FIXED_COLORS[symbol] ?? null;
}
