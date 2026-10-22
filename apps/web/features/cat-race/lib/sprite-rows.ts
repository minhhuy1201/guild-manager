import { GuildClass } from "@guild/shared/enums";

/**
 * Pixel-art cat, drawn from text rows so no image asset is needed. `#` takes the class colour and
 * `d` a darker shade of it (the stripes); the other letters are fixed colours, see `sprite-color`.
 * The sprite is two accessory rows, six body rows and two leg rows.
 */
export const SPRITE_COLUMNS = 14;
export const SPRITE_ROWS = 10;

/** Running frames: stretched, middle, tucked, middle. */
export type LegFrame = 0 | 1 | 2 | 3;
export const LEG_FRAME_COUNT = 4;

/** Class used for a cat whose owner is not on the roster. */
export const FALLBACK_SPRITE_CLASS = GuildClass.CUU_LINH;

/** The two rows above the head, per class: orb, red feather, gold horn, straw hat, helmet, crescent, flower. */
const ACCESSORY_ROWS: Record<GuildClass, readonly [string, string]> = {
  [GuildClass.CUU_LINH]: ["...........c..", ".............."],
  [GuildClass.HUYET_HA]: ["............r.", "...........r.."],
  [GuildClass.LONG_NGAM]: ["..........g...", "..........gg.."],
  [GuildClass.THAN_TUONG]: ["..........yy..", ".........yyyy."],
  [GuildClass.THIET_Y]: ["..........ss..", ".........ssss."],
  [GuildClass.TOAI_MONG]: ["...........mm.", "...........m.."],
  [GuildClass.TO_VAN]: ["...........f.f", "............f."],
};

const BODY_ROWS: readonly string[] = [
  "..........o.o.",
  "o........o#o#o",
  "oo.ooooooo###o",
  ".o#d#d#d###w#o",
  ".o#########ppo",
  "..o########oo.",
];

const LEG_ROWS: Record<LegFrame, readonly string[]> = {
  0: ["..o#o....o#o..", "..oo.....oo..."],
  1: ["...o#o..o#o...", "...oo....oo..."],
  2: ["....o#oo#o....", "....oo..oo...."],
  3: ["...o#o..o#o...", "...oo....oo..."],
};

/**
 * Every row of one sprite, top to bottom.
 * @param guildClass - Decides the accessory
 * @param frame - Which running frame
 * @returns `SPRITE_ROWS` rows of `SPRITE_COLUMNS` characters
 */
export function spriteRows(guildClass: GuildClass, frame: LegFrame): readonly string[] {
  return [...ACCESSORY_ROWS[guildClass], ...BODY_ROWS, ...LEG_ROWS[frame]];
}
