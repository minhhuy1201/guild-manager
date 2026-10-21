import type { DustParticle } from "./race-dust";
import { SPEED_LINE_FROM } from "./cat-motion";
import { STAGE_PALETTE } from "./stage-palette";
import { CROWN_GOLD } from "./sprite-color";

const CROWN_SHAPE = ["g.g.g", "ggggg", "ggggg"] as const;
const CROWN_PIXEL_DIVISOR = 6;
const CROWN_MIN_PIXEL = 2;
const CROWN_GEM_COLUMN = 2;
const CROWN_GEM_ROW = 1;
/** The crown sits at this share of the sprite's width, and at least this many px above it. */
const CROWN_X_SHARE = 0.62;
const CROWN_MIN_LIFT = 6;
const CROWN_LIFT_DIVISOR = 3;

const LINE_COUNT = 3;
const LINE_START = 0.25;
const LINE_STEP = 0.2;
const LINE_LENGTH = 0.35;
const LINE_THICKNESS = 1.5;
const LINE_TOP = -0.15;
const LINE_ROW_STEP = 0.18;
const LINE_MAX_ALPHA = 0.8;
const LINE_ALPHA_GAIN = 3;
const LINE_ALPHA_BASE = 1.1;
const LINE_SHIFT_RATE = 7;
const LINE_SHIFT_WRAP = 6;

const DUST_COLOR = "#c9a27a";
const DUST_ALPHA = 0.7;

/**
 * Paint the leader's pixel crown above its sprite.
 * @param context - Where to paint
 * @param cat - Left edge, top edge (bob included) and size of the sprite
 */
export function paintCrown(
  context: CanvasRenderingContext2D,
  cat: { x: number; top: number; width: number; catHeight: number }
): void {
  const pixel = Math.max(CROWN_MIN_PIXEL, Math.round(cat.catHeight / CROWN_PIXEL_DIVISOR));
  const x = cat.x + cat.width * CROWN_X_SHARE;
  const y = cat.top - Math.max(CROWN_MIN_LIFT, cat.catHeight / CROWN_LIFT_DIVISOR);
  context.fillStyle = CROWN_GOLD;
  CROWN_SHAPE.forEach((row, j) => {
    [...row].forEach((symbol, i) => {
      if (symbol === "g") context.fillRect(x + i * pixel, y + j * pixel, pixel, pixel);
    });
  });
  context.fillStyle = STAGE_PALETTE.lacquer;
  context.fillRect(x + CROWN_GEM_COLUMN * pixel, y + CROWN_GEM_ROW * pixel, pixel, pixel);
}

/**
 * Paint the wind streaks behind a cat faster than `SPEED_LINE_FROM`.
 * @param context - Where to paint
 * @param cat - Left edge, lane centre and size of the sprite
 * @param speed - The cat's speed, 1 being even pace
 * @param clock - The leg clock, which slides the streaks
 */
export function paintSpeedLines(
  context: CanvasRenderingContext2D,
  cat: { x: number; y: number; width: number; height: number },
  speed: number,
  clock: number
): void {
  if (speed <= SPEED_LINE_FROM) return;
  context.fillStyle = STAGE_PALETTE.paper;
  context.globalAlpha = Math.min(LINE_MAX_ALPHA, (speed - LINE_ALPHA_BASE) * LINE_ALPHA_GAIN);
  for (let k = 0; k < LINE_COUNT; k += 1) {
    context.fillRect(
      cat.x - cat.width * (LINE_START + LINE_STEP * k) - ((clock * LINE_SHIFT_RATE) % LINE_SHIFT_WRAP),
      cat.y + cat.height * (LINE_TOP + k * LINE_ROW_STEP),
      cat.width * LINE_LENGTH,
      LINE_THICKNESS
    );
  }
  context.globalAlpha = 1;
}

/**
 * Paint the dust, fading with its age.
 * @param context - Where to paint
 * @param particles - The dust alive, in track coordinates
 * @param scrollTop - How far the lanes are scrolled, in px
 */
export function paintDust(
  context: CanvasRenderingContext2D,
  particles: readonly DustParticle[],
  scrollTop: number
): void {
  if (particles.length === 0) return;
  context.fillStyle = DUST_COLOR;
  for (const p of particles) {
    context.globalAlpha = Math.max(0, p.life / p.maxLife) * DUST_ALPHA;
    context.fillRect(p.x, p.y - scrollTop, p.size, p.size);
  }
  context.globalAlpha = 1;
}
