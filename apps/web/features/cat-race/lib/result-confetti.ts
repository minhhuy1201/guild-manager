import { PrizeTier } from "@guild/shared/enums";

import { STAGE_PALETTE } from "./stage-palette";

const CREAM = "#fff1c1";
const MINT = "#bff0dc";

/** Delay of the side cannons after the centre burst. */
const SIDE_CANNON_DELAY_MS = 350;
const CENTRE_SPREAD = 80;
const SIDE_SPREAD = 60;
const SIDE_ANGLE_DEGREES = 60;
const SIDE_ORIGIN_Y = 0.75;
const CENTRE_ORIGIN_Y = 0.6;
const BIG_COUNT = 140;
const SIDE_COUNT = 90;
const SMALL_COUNT = 70;

/** One `canvas-confetti` call and when to fire it. */
export interface ConfettiBurst {
  delayMs: number;
  options: {
    particleCount: number;
    spread: number;
    origin: { x?: number; y: number };
    angle?: number;
    colors: string[];
  };
}

const COLORS: Record<PrizeTier, string[]> = {
  [PrizeTier.HIGH]: [STAGE_PALETTE.gold, CREAM, STAGE_PALETTE.lacquer],
  [PrizeTier.MEDIUM]: [STAGE_PALETTE.jade, MINT, STAGE_PALETTE.paper],
  [PrizeTier.LOW]: [STAGE_PALETTE.paper, STAGE_PALETTE.paperDim],
};

/**
 * The confetti of a tier: a centre burst, plus two side cannons for the top tier.
 * @param tier - The prize tier
 * @returns Bursts in firing order
 */
export function confettiPlan(tier: PrizeTier): ConfettiBurst[] {
  const colors = COLORS[tier];
  const centre: ConfettiBurst = {
    delayMs: 0,
    options: {
      particleCount: tier === PrizeTier.LOW ? SMALL_COUNT : BIG_COUNT,
      spread: CENTRE_SPREAD,
      origin: { y: CENTRE_ORIGIN_Y },
      colors,
    },
  };
  if (tier !== PrizeTier.HIGH) return [centre];

  return [
    centre,
    ...[0, 1].map((x) => ({
      delayMs: SIDE_CANNON_DELAY_MS,
      options: {
        particleCount: SIDE_COUNT,
        angle: x === 0 ? SIDE_ANGLE_DEGREES : 180 - SIDE_ANGLE_DEGREES,
        spread: SIDE_SPREAD,
        origin: { x, y: SIDE_ORIGIN_Y },
        colors,
      },
    })),
  ];
}
