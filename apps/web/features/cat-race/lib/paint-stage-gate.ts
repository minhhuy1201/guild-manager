import { STAGE_PALETTE } from "./stage-palette";
import { GATE_TEXT, displayFont, type StageFonts } from "./stage-text";

const GATE_MIN_TOP = 16;
const GATE_TOP_SHARE = 0.22;
const PILLAR_OFFSET = 26;
const PILLAR_WIDTH = 6;
const PILLAR_HIGHLIGHT_OFFSET = 24;
const PILLAR_HIGHLIGHT_WIDTH = 3;
const PILLAR_RIGHT_OFFSET = 20;
const PILLAR_HIGHLIGHT_RIGHT_OFFSET = 22;
/** Distance from the roof's top edge to where the pillars start. */
const PILLAR_DROP = 6;
const ROOF_HALF_WIDTH = 34;
const ROOF_WIDTH = 68;
const ROOF_HEIGHT = 6;
const EAVE_OFFSET = 38;
const EAVE_RIGHT_OFFSET = 32;
const EAVE_RISE = 2;
const EAVE_WIDTH = 6;
const EAVE_HEIGHT = 3;
const BEAM_HALF_WIDTH = 30;
const BEAM_DROP = 9;
const BEAM_HEIGHT = 4;
const PLAQUE_HALF_WIDTH = 14;
const PLAQUE_DROP = 14;
const PLAQUE_HEIGHT = 14;
const GATE_TEXT_DROP = 21.5;
const PLAQUE_FONT_PX = 9;

/**
 * Paint the tam quan gate over the finish line, with its "ĐÍCH" plaque.
 * @param context - Where to paint
 * @param centerX - The finish line's x
 * @param band - Height of the sky band
 * @param fonts - The stage fonts
 */
export function paintStageGate(
  context: CanvasRenderingContext2D,
  centerX: number,
  band: number,
  fonts: StageFonts
) {
  const top = Math.max(GATE_MIN_TOP, band * GATE_TOP_SHARE);
  const pillarTop = top + PILLAR_DROP;
  const pillarHeight = band - pillarTop;
  context.fillStyle = STAGE_PALETTE.gatePillarShade;
  context.fillRect(centerX - PILLAR_OFFSET, pillarTop, PILLAR_WIDTH, pillarHeight);
  context.fillRect(centerX + PILLAR_RIGHT_OFFSET, pillarTop, PILLAR_WIDTH, pillarHeight);
  context.fillStyle = STAGE_PALETTE.lacquer;
  context.fillRect(centerX - PILLAR_HIGHLIGHT_OFFSET, pillarTop, PILLAR_HIGHLIGHT_WIDTH, pillarHeight);
  context.fillRect(centerX + PILLAR_HIGHLIGHT_RIGHT_OFFSET, pillarTop, PILLAR_HIGHLIGHT_WIDTH, pillarHeight);
  context.fillStyle = STAGE_PALETTE.gateRoof;
  context.fillRect(centerX - ROOF_HALF_WIDTH, top, ROOF_WIDTH, ROOF_HEIGHT);
  context.fillRect(centerX - EAVE_OFFSET, top - EAVE_RISE, EAVE_WIDTH, EAVE_HEIGHT);
  context.fillRect(centerX + EAVE_RIGHT_OFFSET, top - EAVE_RISE, EAVE_WIDTH, EAVE_HEIGHT);
  context.fillStyle = STAGE_PALETTE.lacquer;
  context.fillRect(centerX - BEAM_HALF_WIDTH, top + BEAM_DROP, BEAM_HALF_WIDTH * 2, BEAM_HEIGHT);
  context.fillStyle = STAGE_PALETTE.gold;
  context.fillRect(centerX - PLAQUE_HALF_WIDTH, top + PLAQUE_DROP, PLAQUE_HALF_WIDTH * 2, PLAQUE_HEIGHT);
  context.fillStyle = STAGE_PALETTE.night;
  context.font = displayFont(PLAQUE_FONT_PX, fonts);
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(GATE_TEXT, centerX, top + GATE_TEXT_DROP);
}
