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
