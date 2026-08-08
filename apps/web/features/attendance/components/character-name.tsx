import { GuildClassIcon } from "@/components/shared/guild-class-icon";
import type { Character } from "../types/attendance";

interface CharacterNameProps {
  /** Nhân vật cần hiển thị */
  character: Character;
}

/**
 * Ô hiển thị nhân vật: icon lưu phái + tên.
 * @param character - Nhân vật cần hiển thị
 * @returns Cụm avatar + tên nhân vật
 */
export function CharacterName({ character }: CharacterNameProps) {
  return (
    // Giới hạn bề ngang trên điện thoại để cột tên (đang ghim trái) không ăn
    // hết màn hình khi tên nhân vật dài.
    <div className="flex max-w-36 items-center gap-2 sm:max-w-none">
      <GuildClassIcon guildClass={character.guildClass} />
      <span className="truncate font-medium">{character.name}</span>
    </div>
  );
}
