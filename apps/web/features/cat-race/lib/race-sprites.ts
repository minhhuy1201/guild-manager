import type { GuildClass } from "@guild/shared/enums";

import { GUILD_CLASS_COLOR } from "@/lib/guild-class";
import { pixelColor } from "./sprite-color";
import { SPRITE_COLUMNS, SPRITE_ROWS, spriteRows, type LegFrame } from "./sprite-rows";

const cache = new Map<string, HTMLCanvasElement>();

/**
 * A cat sprite, drawn once per class, size and frame.
 * @param guildClass - Decides the body colour and the accessory
 * @param sizePx - Width in CSS px
 * @param frame - Which running frame
 * @returns A canvas ready for `drawImage`, scaled for the device pixel ratio
 */
export function catSprite(guildClass: GuildClass, sizePx: number, frame: LegFrame): HTMLCanvasElement {
  const width = Math.max(1, Math.round(sizePx));
  const key = `${guildClass}|${width}|${frame}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const ratio = window.devicePixelRatio || 1;
  const pixel = (width * ratio) / SPRITE_COLUMNS;
  const sprite = document.createElement("canvas");
  sprite.width = Math.ceil(width * ratio);
  sprite.height = Math.ceil(pixel * SPRITE_ROWS);
  const context = sprite.getContext("2d");
  if (!context) return sprite;

  const body = GUILD_CLASS_COLOR[guildClass];
  spriteRows(guildClass, frame).forEach((row, y) => {
    [...row].forEach((symbol, x) => {
      const fill = pixelColor(symbol, body);
      if (!fill) return;
      context.fillStyle = fill;
      context.fillRect(
        Math.floor(x * pixel),
        Math.floor(y * pixel),
        Math.ceil(pixel),
        Math.ceil(pixel)
      );
    });
  });
  cache.set(key, sprite);

  return sprite;
}
