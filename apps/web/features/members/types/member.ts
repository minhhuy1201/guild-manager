import type { GuildClass } from "@shared/enums";

/** Một thành viên trong bang. */
export interface Member {
  id: string;
  name: string;
  guildClass: GuildClass;
}
