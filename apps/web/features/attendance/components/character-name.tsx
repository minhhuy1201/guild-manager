import { GUILD_CLASS_LABEL } from "@shared/enums";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { GUILD_CLASS_IMAGE } from "@/lib/guild-class";
import type { Character } from "../types/attendance";

interface CharacterNameProps {
  /** Nhân vật cần hiển thị */
  character: Character;
}

/**
 * Ô hiển thị nhân vật: icon lưu phái (Avatar) + tên.
 * Icon có tooltip là tên lưu phái để tra cứu nhanh.
 * @param character - Nhân vật cần hiển thị
 * @returns Cụm avatar + tên nhân vật
 */
export function CharacterName({ character }: CharacterNameProps) {
  const classLabel = GUILD_CLASS_LABEL[character.guildClass];
  return (
    <div className="flex items-center gap-2">
      <Tooltip>
        <TooltipTrigger
          render={
            <Avatar size="sm">
              <AvatarImage
                src={GUILD_CLASS_IMAGE[character.guildClass]}
                alt={classLabel}
              />
              <AvatarFallback>{classLabel[0]}</AvatarFallback>
            </Avatar>
          }
        />
        <TooltipContent>{classLabel}</TooltipContent>
      </Tooltip>
      <span className="font-medium">{character.name}</span>
    </div>
  );
}
