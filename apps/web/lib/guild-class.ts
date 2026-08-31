import { GuildClass } from "@guild/shared/enums";

/**
 * Icon image path (under `public/img`) per guild class.
 * The images are web assets, so the map lives on the frontend rather than in the shared package.
 */
export const GUILD_CLASS_IMAGE: Record<GuildClass, string> = {
  [GuildClass.CUU_LINH]: "/img/cuuLinh.png",
  [GuildClass.HUYET_HA]: "/img/huyetHa.png",
  [GuildClass.LONG_NGAM]: "/img/longNgam.png",
  [GuildClass.THAN_TUONG]: "/img/thanTuong.png",
  [GuildClass.THIET_Y]: "/img/thietY.png",
  [GuildClass.TOAI_MONG]: "/img/toaiMong.png",
  [GuildClass.TO_VAN]: "/img/toVan.png",
};

/**
 * Brand colour per guild class — the class colours the guild already uses in game, so a card is
 * recognised here by the same hue as everywhere else.
 * Hex rather than an oklch token: these are given values, not part of the design system's palette.
 */
export const GUILD_CLASS_COLOR: Record<GuildClass, string> = {
  [GuildClass.CUU_LINH]: "#BB8ED0",
  [GuildClass.HUYET_HA]: "#E06666",
  [GuildClass.LONG_NGAM]: "#6AA84F",
  [GuildClass.THAN_TUONG]: "#0070C0",
  [GuildClass.THIET_Y]: "#FFC000",
  [GuildClass.TOAI_MONG]: "#BDD6EE",
  [GuildClass.TO_VAN]: "#FAA6D0",
};

/** How much of the class colour is left in the surface behind the card's text. */
const SURFACE_MIX = "12%";

/** The two colours a card takes from its class. */
export interface GuildClassSurface {
  /** The class colour at full strength */
  borderColor: string;
  /** The same colour as a whisper over `--card` */
  backgroundColor: string;
}

/**
 * Border and surface of a card that belongs to one guild class.
 *
 * Inline styles rather than Tailwind classes: the colour comes from data, and a class name built at
 * runtime is not in the stylesheet Tailwind generates. The surface is mixed against `--card` instead
 * of being a second hard-coded pastel, so one value per class covers both themes — the tint stays a
 * whisper of the hue over whatever the card colour is.
 * @param guildClass - Class whose colour is applied
 * @returns The border colour and the tinted background
 */
export function guildClassSurface(guildClass: GuildClass): GuildClassSurface {
  const color = GUILD_CLASS_COLOR[guildClass];

  return {
    borderColor: color,
    backgroundColor: `color-mix(in oklab, ${color} ${SURFACE_MIX}, var(--card))`,
  };
}
