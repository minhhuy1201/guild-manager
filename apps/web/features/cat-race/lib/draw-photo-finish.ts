import type { GuildClass } from "@guild/shared/enums";

import { STAGE_PALETTE } from "./stage-palette";
import { catSprite } from "./race-sprites";
import { SPRITE_COLUMNS, SPRITE_ROWS } from "./sprite-rows";

/** The photo's bitmap size in px; the panel scales it to its width. */
export const PHOTO_WIDTH = 420;
export const PHOTO_HEIGHT = 200;

/** One cat in the photo. */
export interface PhotoRow {
  readonly label: string;
  readonly guildClass: GuildClass;
  /** Cat bodies short of the line; 0 for the winner */
  readonly lengthsBehind: number;
}

const FINISH_X = PHOTO_WIDTH * 0.74;
const CAT_WIDTH = 92;
const FINISH_SQUARE = 10;
const FINISH_COLUMNS = 2;
const LABEL_BAR_WIDTH = 200;
const LABEL_BAR_HEIGHT = 24;
const LABEL_FONT_PX = 13;
const LABEL_PADDING = 8;
/** Sprites sit a little below the lane's middle so the legs clear the label bar. */
const CAT_DROP = 6;

/**
 * Paint the photo finish: the first cats nose to nose at the line, drawn from the script and not
 * copied off the track, whose lanes may be scrolled out of view.
 * @param context - The photo canvas's context
 * @param rows - Cats from the front, at most two
 * @param fontFamily - Font family for the labels
 */
export function drawPhotoFinish(
  context: CanvasRenderingContext2D,
  rows: readonly PhotoRow[],
  fontFamily: string
): void {
  const rowHeight = PHOTO_HEIGHT / rows.length;
  const spriteHeight = (CAT_WIDTH * SPRITE_ROWS) / SPRITE_COLUMNS;
  context.imageSmoothingEnabled = false;
  rows.forEach((row, index) => {
    const top = index * rowHeight;
    context.fillStyle = index % 2 ? STAGE_PALETTE.earthAlt : STAGE_PALETTE.earth;
    context.fillRect(0, top, PHOTO_WIDTH, rowHeight);
    for (let y = 0; y < rowHeight; y += FINISH_SQUARE) {
      for (let column = 0; column < FINISH_COLUMNS; column += 1) {
        const isLight = (Math.floor(y / FINISH_SQUARE) + column) % 2 === 1;
        context.fillStyle = isLight ? STAGE_PALETTE.paper : STAGE_PALETTE.night;
        context.fillRect(FINISH_X + column * FINISH_SQUARE, top + y, FINISH_SQUARE, FINISH_SQUARE);
      }
    }
    const nose = FINISH_X - row.lengthsBehind * CAT_WIDTH;
    context.drawImage(
      catSprite(row.guildClass, CAT_WIDTH, 0),
      nose - CAT_WIDTH,
      top + rowHeight / 2 - spriteHeight / 2 + CAT_DROP,
      CAT_WIDTH,
      spriteHeight
    );
    context.fillStyle = STAGE_PALETTE.plate;
    context.fillRect(0, top, LABEL_BAR_WIDTH, LABEL_BAR_HEIGHT);
    context.fillStyle = index === 0 ? STAGE_PALETTE.gold : STAGE_PALETTE.paper;
    context.font = `700 ${LABEL_FONT_PX}px ${fontFamily}`;
    context.textAlign = "left";
    context.textBaseline = "middle";
    context.fillText(`${index + 1}. ${row.label}`, LABEL_PADDING, top + LABEL_BAR_HEIGHT / 2);
  });
}
