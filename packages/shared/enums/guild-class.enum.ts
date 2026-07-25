/**
 * Lưu phái (class nhân vật) trong game.
 * Dùng chung cho cả FE và BE.
 */
export enum GuildClass {
  CUU_LINH = "CUU_LINH",
  HUYET_HA = "HUYET_HA",
  LONG_NGAM = "LONG_NGAM",
  THAN_TUONG = "THAN_TUONG",
  THIET_Y = "THIET_Y",
  TOAI_MONG = "TOAI_MONG",
  TO_VAN = "TO_VAN",
}

/**
 * Nhãn hiển thị tiếng Việt cho từng lưu phái.
 */
export const GUILD_CLASS_LABEL: Record<GuildClass, string> = {
  [GuildClass.CUU_LINH]: "Cửu Linh",
  [GuildClass.HUYET_HA]: "Huyết Hà",
  [GuildClass.LONG_NGAM]: "Long Ngâm",
  [GuildClass.THAN_TUONG]: "Thần Tương",
  [GuildClass.THIET_Y]: "Thiết Y",
  [GuildClass.TOAI_MONG]: "Toái Mộng",
  [GuildClass.TO_VAN]: "Tố Vấn",
};

/** Danh sách lưu phái theo thứ tự hiển thị. */
export const GUILD_CLASS_OPTIONS: GuildClass[] = Object.values(GuildClass);
