import { GuildClass } from "@shared/enums";

/**
 * Đường dẫn ảnh icon (trong `public/img`) cho từng lưu phái.
 * Ảnh là asset của web nên map ở FE, không đưa vào package shared.
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
