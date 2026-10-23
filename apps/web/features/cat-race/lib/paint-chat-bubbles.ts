import type { ChatBubble, ChatTone } from "./race-chatter";
import { STAGE_PALETTE } from "./stage-palette";
import { bodyFont, displayFont, type StageFonts } from "./stage-text";

const FONT_PX = 11;
const BODY_WEIGHT = 600;
const PAD_X = 6;
const BOX_HEIGHT = 17;
const RADIUS = 5;
const TAIL_HEIGHT = 5;
const TAIL_HALF_WIDTH = 4;
const SHADOW_OFFSET = 2;
/** Gap kept between a bubble and the canvas edge. */
const EDGE_MARGIN = 2;
const POP_SECONDS = 0.16;
const POP_PEAK = 1.12;
/** Share of the pop spent growing to the peak; the rest settles back to full size. */
const POP_PEAK_AT = 0.6;
const FLOAT_PX = 6;
const FADE_SHARE = 0.25;

/** Fill, text and font of each tone. */
const TONE_STYLE: Record<ChatTone, { fill: string; ink: string; isDisplay: boolean }> = {
  plain: { fill: STAGE_PALETTE.paper, ink: STAGE_PALETTE.night, isDisplay: false },
  hype: { fill: STAGE_PALETTE.lacquer, ink: STAGE_PALETTE.paper, isDisplay: true },
  lead: { fill: STAGE_PALETTE.gold, ink: STAGE_PALETTE.night, isDisplay: true },
};

/**
 * Size of a bubble as it springs up: 0, over the peak, then 1.
 * @param age - Seconds since the bubble appeared
 * @returns A scale factor
 */
export function popScale(age: number): number {
  if (age >= POP_SECONDS) return 1;
  const t = age / POP_SECONDS;
  if (t < POP_PEAK_AT) return (POP_PEAK * t) / POP_PEAK_AT;

  return POP_PEAK - ((POP_PEAK - 1) * (t - POP_PEAK_AT)) / (1 - POP_PEAK_AT);
}

/**
 * Opacity of a bubble, full until the last quarter of its life.
 * @param age - Seconds since the bubble appeared
 * @param life - Its lifetime in seconds
 * @returns 0..1
 */
export function fadeAlpha(age: number, life: number): number {
  const left = (life - age) / (life * FADE_SHARE);

  return Math.min(1, Math.max(0, left));
}

/**
 * Paint one speech bubble with its tail tip on `tail`, popping up, drifting and fading by age.
 * @param context - Where to paint
 * @param bubble - The bubble
 * @param tail - Where the tail points, in canvas px
 * @param view - The animation clock, the stage fonts and the canvas width the bubble must stay in
 */
export function paintChatBubble(
  context: CanvasRenderingContext2D,
  bubble: ChatBubble,
  tail: { x: number; y: number },
  view: { time: number; fonts: StageFonts; width: number }
): void {
  const age = view.time - bubble.bornAt;
  const style = TONE_STYLE[bubble.tone];
  context.font = style.isDisplay ? displayFont(FONT_PX, view.fonts) : bodyFont(FONT_PX, BODY_WEIGHT, view.fonts);
  const boxWidth = context.measureText(bubble.text).width + PAD_X * 2;
  const left = Math.min(Math.max(EDGE_MARGIN, tail.x - boxWidth / 2), view.width - EDGE_MARGIN - boxWidth);
  const tailX = Math.min(Math.max(tail.x, left + RADIUS + TAIL_HALF_WIDTH), left + boxWidth - RADIUS - TAIL_HALF_WIDTH);
  const rise = (age / bubble.life) * FLOAT_PX;
  const scale = popScale(age);

  context.save();
  context.globalAlpha = fadeAlpha(age, bubble.life);
  context.translate(tailX, tail.y - rise);
  context.scale(scale, scale);
  context.translate(-tailX, -(tail.y - rise));
  const top = tail.y - rise - TAIL_HEIGHT - BOX_HEIGHT;
  for (const [offset, color] of [
    [SHADOW_OFFSET, STAGE_PALETTE.bubbleShadow],
    [0, style.fill],
  ] as const) {
    context.fillStyle = color;
    context.beginPath();
    context.roundRect(left + offset, top + offset, boxWidth, BOX_HEIGHT, RADIUS);
    context.moveTo(tailX - TAIL_HALF_WIDTH + offset, top + BOX_HEIGHT + offset);
    context.lineTo(tailX + TAIL_HALF_WIDTH + offset, top + BOX_HEIGHT + offset);
    context.lineTo(tailX + offset, top + BOX_HEIGHT + TAIL_HEIGHT + offset);
    context.closePath();
    context.fill();
  }
  context.fillStyle = style.ink;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(bubble.text, left + boxWidth / 2, top + BOX_HEIGHT / 2);
  context.restore();
}
