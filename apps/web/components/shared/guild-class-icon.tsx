"use client";

import { GUILD_CLASS_LABEL } from "@guild/shared/enums";
import type { GuildClass } from "@guild/shared/enums";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { GUILD_CLASS_IMAGE } from "@/lib/guild-class";

interface GuildClassIconProps {
  /** Class to display */
  guildClass: GuildClass;
}

/**
 * SHARED PATTERN: a guild class always renders as an icon rather than text — every table is narrow
 * and class names are long. The tooltip keeps the name for lookup, the image's alt covers screen
 * readers.
 * @param guildClass - Class to display
 * @returns The class icon avatar with a name tooltip
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
