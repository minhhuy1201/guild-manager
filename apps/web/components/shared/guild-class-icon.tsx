"use client";

import { GUILD_CLASS_LABEL } from "@shared/enums";
import type { GuildClass } from "@shared/enums";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { GUILD_CLASS_IMAGE } from "@/lib/guild-class";

interface GuildClassIconProps {
  /** Lưu phái cần hiển thị */
  guildClass: GuildClass;
}

/**
 * PATTERN CHUNG: lưu phái luôn hiển thị bằng icon thay vì chữ — bảng nào cũng
 * hẹp mà tên lưu phái thì dài. Tooltip giữ lại tên để tra cứu, alt của ảnh lo
 * phần screen-reader.
 * @param guildClass - Lưu phái cần hiển thị
 * @returns Avatar icon lưu phái kèm tooltip tên
 */
export function GuildClassIcon({ guildClass }: GuildClassIconProps) {
  const label = GUILD_CLASS_LABEL[guildClass];

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Avatar size="sm">
            <AvatarImage src={GUILD_CLASS_IMAGE[guildClass]} alt={label} />
            <AvatarFallback>{label[0]}</AvatarFallback>
          </Avatar>
        }
      />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
