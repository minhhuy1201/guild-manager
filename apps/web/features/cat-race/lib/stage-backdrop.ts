import type { LaneLayout } from "./race-layout";
import { STAGE_PALETTE } from "./stage-palette";

const SKY_MID_STOP = 0.55;
const MOON_X_SHARE = 0.78;
const MOON_Y_SHARE = 0.3;
const MOON_RADIUS_SHARE = 0.13;
const MOON_ALPHA = 0.9;
/** Ridge outline sampling step in px, and the three sine layers that shape it. */
const RIDGE_STEP = 6;
const RIDGE_WAVES = [
  { weight: 0.55, frequency: 0.011, seedFactor: 1 },
  { weight: 0.3, frequency: 0.027, seedFactor: 2 },
  { weight: 0.15, frequency: 0.07, seedFactor: 3 },
] as const;
const FAR_RIDGE = { base: 0.62, amplitude: 0.22, seed: 1.3 } as const;
const NEAR_RIDGE = { base: 0.74, amplitude: 0.16, seed: 4.1 } as const;
const PAGODA_X_SHARE = 0.3;
const PAGODA_Y_SHARE = 0.58;
const PAGODA_TIERS = 3;
const PAGODA_TIER_HEIGHT = 9;
const PAGODA_BASE_WIDTH = 22;
const PAGODA_TIER_NARROWING = 6;
const PAGODA_ROOF_THICKNESS = 3;
const PAGODA_WALL_HEIGHT = 6;
const PAGODA_WALL_INSET = 4;
/** How far a tier's roof and wall start above the tier's baseline. */
const PAGODA_ROOF_RISE = 4;
const PAGODA_WALL_RISE = 1;

/**
 * Paint one mountain ridge as a filled silhouette.
 * @param context - Where to paint
 * @param width - Band width in px
 * @param band - Band height in px
 * @param ridge - Base and amplitude as shares of the band, and the wave seed
 * @param color - Fill colour
 */
function paintRidge(
  context: CanvasRenderingContext2D,
  width: number,
  band: number,
  ridge: { base: number; amplitude: number; seed: number },
  color: string
) {
  context.fillStyle = color;
  context.beginPath();
  context.moveTo(0, band);
  for (let x = 0; x <= width; x += RIDGE_STEP) {
    const wave = RIDGE_WAVES.reduce(
      (sum, w) => sum + w.weight * Math.sin(x * w.frequency + ridge.seed * w.seedFactor),
      0
    );
    context.lineTo(x, band * ridge.base - band * ridge.amplitude * wave);
  }
  context.lineTo(width, band);
  context.closePath();
  context.fill();
}

/**
 * Paint the three-tier pagoda silhouette on the far ridge.
 * @param context - Where to paint
 * @param width - Band width in px
 * @param band - Band height in px
 */
function paintPagoda(context: CanvasRenderingContext2D, width: number, band: number) {
  context.fillStyle = STAGE_PALETTE.ridgeNear;
  const x = width * PAGODA_X_SHARE;
  const y = band * PAGODA_Y_SHARE;
  for (let tier = 0; tier < PAGODA_TIERS; tier += 1) {
    const tierWidth = PAGODA_BASE_WIDTH - tier * PAGODA_TIER_NARROWING;
    const top = y - tier * PAGODA_TIER_HEIGHT;
    context.fillRect(x - tierWidth / 2, top - PAGODA_ROOF_RISE, tierWidth, PAGODA_ROOF_THICKNESS);
    context.fillRect(
      x - tierWidth / 2 + PAGODA_WALL_INSET,
      top - PAGODA_WALL_RISE,
      tierWidth - PAGODA_WALL_INSET * 2,
      PAGODA_WALL_HEIGHT
    );
  }
}

/**
 * Paint the part of the sky band that never changes: dusk gradient, moon, two ridges and the pagoda.
 * Drawn once per size onto an offscreen canvas.
 * @param width - Band width in px
 * @param layout - The layout, for the band height
 * @param ratio - Device pixel ratio
 * @returns The finished backdrop, or null when the browser gives no 2D context
 */
export function renderBackdrop(
  width: number,
  layout: LaneLayout,
  ratio: number
): HTMLCanvasElement | null {
  const { band } = layout;
  const backdrop = document.createElement("canvas");
  backdrop.width = Math.round(width * ratio);
  backdrop.height = Math.round(band * ratio);
  const context = backdrop.getContext("2d");
  if (!context) return null;

  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  const sky = context.createLinearGradient(0, 0, 0, band);
  sky.addColorStop(0, STAGE_PALETTE.skyTop);
  sky.addColorStop(SKY_MID_STOP, STAGE_PALETTE.skyMid);
  sky.addColorStop(1, STAGE_PALETTE.skyHorizon);
  context.fillStyle = sky;
  context.fillRect(0, 0, width, band);
  context.fillStyle = STAGE_PALETTE.moon;
  context.globalAlpha = MOON_ALPHA;
  context.beginPath();
  context.arc(width * MOON_X_SHARE, band * MOON_Y_SHARE, band * MOON_RADIUS_SHARE, 0, Math.PI * 2);
  context.fill();
  context.globalAlpha = 1;
  paintRidge(context, width, band, FAR_RIDGE, STAGE_PALETTE.ridgeFar);
  paintRidge(context, width, band, NEAR_RIDGE, STAGE_PALETTE.ridgeNear);
  paintPagoda(context, width, band);

  return backdrop;
}
