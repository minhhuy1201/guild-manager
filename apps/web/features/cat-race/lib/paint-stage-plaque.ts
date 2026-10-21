import { STAGE_PALETTE } from "./stage-palette";
import { TITLE_TEXT, bodyFont, displayFont, type StageFonts } from "./stage-text";

const PLAQUE_PADDING = 10;
const TITLE_BASELINE_SHARE = 0.42;
const TITLE_FONT_PX = 15;
const TITLE_FONT_PX_NARROW = 12;
/** Bands taller than this are the wide one. */
const WIDE_BAND_FROM = 80;
const COUNT_FONT_PX = 11;
const COUNT_FONT_WEIGHT = 500;
const COUNT_LINE_GAP = 16;

/**
 * Paint the wooden plaque over the name column: the title and how many cats and people race.
 * @param context - Where to paint
 * @param nameColumn - Width of the name column
 * @param band - Height of the sky band
 * @param counts - Cats and people in the field
 * @param fonts - The stage fonts
 */
export function paintStagePlaque(
  context: CanvasRenderingContext2D,
  nameColumn: number,
  band: number,
  counts: { cats: number; people: number },
  fonts: StageFonts
) {
  context.fillStyle = STAGE_PALETTE.nameColumn;
  context.fillRect(0, 0, nameColumn, band);
  context.fillStyle = STAGE_PALETTE.gold;
  context.fillRect(nameColumn - 1, 0, 1, band);
  context.textAlign = "left";
  context.textBaseline = "alphabetic";
  const baseline = band * TITLE_BASELINE_SHARE;
  context.font = displayFont(band > WIDE_BAND_FROM ? TITLE_FONT_PX : TITLE_FONT_PX_NARROW, fonts);
  context.fillText(TITLE_TEXT, PLAQUE_PADDING, baseline);
  context.fillStyle = STAGE_PALETTE.paperDim;
  context.font = bodyFont(COUNT_FONT_PX, COUNT_FONT_WEIGHT, fonts);
  context.fillText(`${counts.cats} mèo · ${counts.people} người`, PLAQUE_PADDING, baseline + COUNT_LINE_GAP);
}
