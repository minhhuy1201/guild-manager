import { paintChatBubble } from "./paint-chat-bubbles";
import { paintStageGate } from "./paint-stage-gate";
import { paintStagePlaque } from "./paint-stage-plaque";
import type { ChatBubble } from "./race-chatter";
import { markX, type LaneLayout } from "./race-layout";
import { ARMS_UP_FROM } from "./stage-excitement";
import { STAGE_PALETTE } from "./stage-palette";
import type { Spectator } from "./stage-crowd";
import { bodyFont, type StageFonts } from "./stage-text";

/** What the sky band needs besides the clock; it changes on resize only. */
export interface BandScene {
  readonly layout: LaneLayout;
  readonly width: number;
  /** The prerendered sky, moon, ridges and pagoda */
  readonly backdrop: HTMLCanvasElement | null;
  readonly crowd: readonly Spectator[];
  readonly fonts: StageFonts;
  readonly cats: number;
  readonly people: number;
}

const SWAY_SPEED = 1.3;
const SWAY_AMPLITUDE = 1.5;
const LANTERN_SPACING = 140;
const LANTERN_FIRST_OFFSET = 70;
const STRING_STEP = 8;
const STRING_TOP = 10;
const STRING_SAG = 9;
const LANTERN_TOP = 19;
const GLOW_RADIUS = 22;
const GLOW_CENTER_DROP = 6;
const GLOW_INNER_RADIUS = 1;
const GLOW_BOX_SIZE = 44;
const GLOW_BOX_RISE = 16;
const LANTERN_WIDTH = 10;
const LANTERN_HEIGHT = 12;
const LANTERN_CAP_WIDTH = 8;
const LANTERN_CAP_HEIGHT = 2;
const LANTERN_TASSEL_HEIGHT = 4;
const LANTERN_TASSEL_DROP = 14;

const RAIL_HEIGHT = 10;
const RAIL_TOP_HEIGHT = 3;
const RAIL_POST_FIRST = 10;
const RAIL_POST_SPACING = 24;
const RAIL_POST_WIDTH = 3;
const RAIL_POST_HEIGHT = 7;

const BOB_BASE_SPEED = 4;
const SPECTATOR_RAISE = 9;
const SPECTATOR_ROW_RISE = 6;
const BODY_SIZE = 6;
const HEAD_SIZE = 4;
const BODY_DROP = 4;
/** Arms go up on spectators whose phase hash is above this, so only some of the crowd cheers. */
const ARMS_PHASE_HASH = 7;
const ARMS_THRESHOLD = 0.2;
const ARM_HEIGHT = 4;
const ARM_RISE = 3;
const ARM_RIGHT_OFFSET = 5;
const ARM_LEFT_OFFSET = 2;
const ARM_BOB_SHARE = 0.5;
/** A crowd bubble's tail ends this far above the back row's heads, clear of raised arms. */
const BUBBLE_TAIL_GAP = ARM_RISE + ARM_HEIGHT + 1;

const FLAG_SHARES = [0.25, 0.5, 0.75] as const;
const FLAG_FONT_PX = 10;
const FLAG_FONT_WEIGHT = 700;
const FLAG_POLE_HEIGHT = 18;
const FLAG_WIDTH = 10;
const FLAG_HEIGHT = 7;
const FLAG_LABEL_RISE = 21;
const FLAG_LABEL_OFFSET = 6;
const START_POST_HEIGHT = 22;
const START_POST_WIDTH = 3;
const PERCENT = 100;

/**
 * Paint the swinging lantern string with a glow round each lantern.
 * @param context - Where to paint
 * @param scene - The band scene
 * @param time - Seconds on the animation clock
 */
function paintLanterns(context: CanvasRenderingContext2D, scene: BandScene, time: number) {
  const { nameColumn } = scene.layout;
  context.strokeStyle = STAGE_PALETTE.lanternString;
  context.lineWidth = 1;
  context.beginPath();
  for (let x = nameColumn; x <= scene.width; x += STRING_STEP) {
    const along = ((x - nameColumn) % LANTERN_SPACING) / LANTERN_SPACING;
    context.lineTo(x, STRING_TOP + Math.sin(along * Math.PI) * STRING_SAG);
  }
  context.stroke();
  const y = LANTERN_TOP + Math.sin(time * SWAY_SPEED) * SWAY_AMPLITUDE;
  for (let x = nameColumn + LANTERN_FIRST_OFFSET; x < scene.width; x += LANTERN_SPACING) {
    const glow = context.createRadialGradient(
      x,
      y + GLOW_CENTER_DROP,
      GLOW_INNER_RADIUS,
      x,
      y + GLOW_CENTER_DROP,
      GLOW_RADIUS
    );
    glow.addColorStop(0, STAGE_PALETTE.lanternGlow);
    glow.addColorStop(1, STAGE_PALETTE.lanternGlowFade);
    context.fillStyle = glow;
    context.fillRect(x - GLOW_RADIUS, y - GLOW_BOX_RISE, GLOW_BOX_SIZE, GLOW_BOX_SIZE);
    context.fillStyle = STAGE_PALETTE.lanternBody;
    context.fillRect(x - LANTERN_WIDTH / 2, y, LANTERN_WIDTH, LANTERN_HEIGHT);
    context.fillStyle = STAGE_PALETTE.gold;
    context.fillRect(x - LANTERN_CAP_WIDTH / 2, y - LANTERN_CAP_HEIGHT, LANTERN_CAP_WIDTH, LANTERN_CAP_HEIGHT);
    context.fillRect(x - LANTERN_CAP_WIDTH / 2, y + LANTERN_HEIGHT, LANTERN_CAP_WIDTH, LANTERN_CAP_HEIGHT);
    context.fillRect(x, y + LANTERN_TASSEL_DROP, 1, LANTERN_TASSEL_HEIGHT);
  }
}

/**
 * Paint the spectators behind the rail, bobbing with the excitement.
 * @param context - Where to paint
 * @param crowd - The spectators
 * @param railY - Top of the rail
 * @param time - Seconds on the animation clock
 * @param excitement - Bob strength
 */
function paintCrowd(
  context: CanvasRenderingContext2D,
  crowd: readonly Spectator[],
  railY: number,
  time: number,
  excitement: number
) {
  for (const spectator of crowd) {
    const bob = Math.max(0, Math.sin(time * (BOB_BASE_SPEED + excitement) + spectator.phase)) * excitement;
    const y = railY - SPECTATOR_RAISE - spectator.row * SPECTATOR_ROW_RISE - bob;
    context.fillStyle = spectator.shirt;
    context.fillRect(spectator.x - 1, y + BODY_DROP, BODY_SIZE, BODY_SIZE);
    context.fillStyle = spectator.skin;
    context.fillRect(spectator.x, y, HEAD_SIZE, HEAD_SIZE);
    if (excitement < ARMS_UP_FROM || Math.sin(spectator.phase * ARMS_PHASE_HASH) <= ARMS_THRESHOLD) continue;
    const armY = y - ARM_RISE - bob * ARM_BOB_SHARE;
    context.fillRect(spectator.x - ARM_LEFT_OFFSET, armY, 1, ARM_HEIGHT);
    context.fillRect(spectator.x + ARM_RIGHT_OFFSET, armY, 1, ARM_HEIGHT);
  }
}

/**
 * Paint the crowd's speech bubbles over the spectators' heads, behind the rail.
 * @param context - Where to paint
 * @param scene - The band scene
 * @param bubbles - The bubbles alive; only crowd ones are drawn
 * @param view - Top of the rail and the animation clock
 */
function paintCrowdBubbles(
  context: CanvasRenderingContext2D,
  scene: BandScene,
  bubbles: readonly ChatBubble[],
  view: { railY: number; time: number }
) {
  const tailY = view.railY - SPECTATOR_RAISE - SPECTATOR_ROW_RISE - BUBBLE_TAIL_GAP;
  for (const bubble of bubbles) {
    if (bubble.anchor.kind !== "crowd") continue;
    paintChatBubble(context, bubble, { x: bubble.anchor.x, y: tailY }, { time: view.time, fonts: scene.fonts, width: scene.width });
  }
}

/**
 * Paint the wooden rail the crowd leans on.
 * @param context - Where to paint
 * @param scene - The band scene
 * @param railY - Top of the rail
 */
function paintRail(context: CanvasRenderingContext2D, scene: BandScene, railY: number) {
  const { nameColumn } = scene.layout;
  const railWidth = scene.width - nameColumn;
  context.fillStyle = STAGE_PALETTE.rail;
  context.fillRect(nameColumn, railY, railWidth, RAIL_HEIGHT);
  context.fillStyle = STAGE_PALETTE.railTop;
  context.fillRect(nameColumn, railY, railWidth, RAIL_TOP_HEIGHT);
  context.fillStyle = STAGE_PALETTE.railPost;
  for (let x = nameColumn + RAIL_POST_FIRST; x < scene.width; x += RAIL_POST_SPACING) {
    context.fillRect(x, railY + RAIL_TOP_HEIGHT, RAIL_POST_WIDTH, RAIL_POST_HEIGHT);
  }
}

/**
 * Paint the 25/50/75% flags and the start post on the rail.
 * @param context - Where to paint
 * @param scene - The band scene
 * @param railY - Top of the rail
 */
function paintMarks(context: CanvasRenderingContext2D, scene: BandScene, railY: number) {
  context.font = bodyFont(FLAG_FONT_PX, FLAG_FONT_WEIGHT, scene.fonts);
  context.textAlign = "center";
  context.textBaseline = "alphabetic";
  for (const share of FLAG_SHARES) {
    const x = markX(share, scene.layout);
    context.fillStyle = STAGE_PALETTE.paper;
    context.fillRect(x, railY - FLAG_POLE_HEIGHT, 1, FLAG_POLE_HEIGHT);
    context.fillStyle = STAGE_PALETTE.lacquer;
    context.fillRect(x + 1, railY - FLAG_POLE_HEIGHT, FLAG_WIDTH, FLAG_HEIGHT);
    context.fillStyle = STAGE_PALETTE.paper;
    context.fillText(`${share * PERCENT}%`, x + FLAG_LABEL_OFFSET, railY - FLAG_LABEL_RISE);
  }
  context.fillStyle = STAGE_PALETTE.paper;
  context.fillRect(markX(0, scene.layout) - 1, railY - START_POST_HEIGHT, START_POST_WIDTH, START_POST_HEIGHT);
}

/**
 * Paint the sky band for one frame: the prerendered backdrop, then everything that moves or sits
 * in front of it.
 * @param context - Where to paint
 * @param scene - The band scene
 * @param time - Seconds on the animation clock
 * @param excitement - How hard the crowd bobs, see `excitementAt`
 * @param bubbles - The speech bubbles alive this frame
 */
export function paintStageBand(
  context: CanvasRenderingContext2D,
  scene: BandScene,
  time: number,
  excitement: number,
  bubbles: readonly ChatBubble[]
) {
  const { layout } = scene;
  const railY = layout.band - RAIL_HEIGHT;
  if (scene.backdrop) context.drawImage(scene.backdrop, 0, 0, scene.width, layout.band);
  paintLanterns(context, scene, time);
  paintCrowd(context, scene.crowd, railY, time, excitement);
  paintCrowdBubbles(context, scene, bubbles, { railY, time });
  paintRail(context, scene, railY);
  paintMarks(context, scene, railY);
  paintStageGate(context, layout.finishX, layout.band, scene.fonts);
  paintStagePlaque(context, layout.nameColumn, layout.band, { cats: scene.cats, people: scene.people }, scene.fonts);
}
