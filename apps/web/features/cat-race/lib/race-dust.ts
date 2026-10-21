/** Most dust particles alive at once, whatever the field size. */
export const MAX_DUST = 420;
/** Spawn chance per cat per 60 Hz frame; it falls with the field so 240 cats do not smother the track. */
const SPAWN_CHANCE = 0.18;
const FRAME_RATE = 60;
const CATS_PER_UNIT = 30;
const DUST_LIFE_SECONDS = 0.5;
const DUST_MIN_SIZE = 2;
const DUST_SIZE_DIVISOR = 12;
const VX_BASE = -20;
const VX_SPREAD = 30;
const VY_BASE = -8;
const VY_SPREAD = 10;
/** Where the puff starts, behind the sprite's back foot. */
const BACK_OFFSET = 2;
const FOOT_DROP = 0.38;

/** One puff of dust, in track coordinates (not scrolled). */
export interface DustParticle {
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  readonly size: number;
  readonly life: number;
  readonly maxLife: number;
}

/**
 * Chance a running cat kicks up dust in one frame.
 * @param dt - Seconds since the last frame
 * @param catCount - Cats in the race
 * @returns A probability
 */
export function dustChance(dt: number, catCount: number): number {
  return (SPAWN_CHANCE * dt * FRAME_RATE) / Math.max(1, catCount / CATS_PER_UNIT);
}

/**
 * Maybe a puff behind a running cat.
 * @param cat - Left edge, lane centre and size of the sprite
 * @param context.alive - Particles alive now, including ones spawned this frame
 * @param context.dt - Seconds since the last frame
 * @param context.catCount - Cats in the race
 * @param random - Source of randomness in [0, 1)
 * @returns The new particle, or null when none spawns or the cap is reached
 */
export function spawnDust(
  cat: { x: number; y: number; width: number; height: number; catHeight: number },
  context: { alive: number; dt: number; catCount: number },
  random: () => number
): DustParticle | null {
  if (context.alive >= MAX_DUST) return null;
  if (random() >= dustChance(context.dt, context.catCount)) return null;

  return {
    x: cat.x + BACK_OFFSET,
    y: cat.y + cat.height * FOOT_DROP,
    vx: VX_BASE - random() * VX_SPREAD,
    vy: VY_BASE - random() * VY_SPREAD,
    size: Math.max(DUST_MIN_SIZE, cat.catHeight / DUST_SIZE_DIVISOR),
    life: DUST_LIFE_SECONDS,
    maxLife: DUST_LIFE_SECONDS,
  };
}

/**
 * Move the dust on and drop what has faded.
 * @param particles - The dust alive
 * @param dt - Seconds since the last frame
 * @returns A new list
 */
export function stepDust(particles: readonly DustParticle[], dt: number): DustParticle[] {
  return particles
    .map((p) => ({ ...p, x: p.x + p.vx * dt, y: p.y + p.vy * dt, life: p.life - dt }))
    .filter((p) => p.life > 0);
}
