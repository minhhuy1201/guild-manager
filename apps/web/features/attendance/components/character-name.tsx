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
    <div className="flex items-center gap-2">
      <GuildClassIcon guildClass={character.guildClass} />
      <span className="font-medium">{character.name}</span>
    </div>
  );
}
