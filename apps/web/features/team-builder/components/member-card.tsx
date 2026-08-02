import { GUILD_CLASS_LABEL } from "@shared/enums";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Character } from "@/features/attendance";
import { GUILD_CLASS_IMAGE } from "@/lib/guild-class";
import { cn } from "@/lib/utils";

interface MemberCardProps {
  /** Character to display */
  character: Character;
  /** Why this placement breaks the slot's class rule. Empty or omitted means valid. */
  invalidReason?: string;
  /** Extra classes for the outer element */
  className?: string;
}

/**
 * A guild member shown as a compact card: class avatar plus character name.
 * Purely presentational — no drag behaviour, so it can also render inside DragOverlay.
 * When `invalidReason` is set the card gets a destructive border and a tooltip.
 * @param character - Character to display
 * @param invalidReason - Reason the placement is invalid, if any
 * @param className - Extra classes for the outer element
 * @returns The member card, wrapped in a tooltip when invalid
 */
export function MemberCard({ character, invalidReason, className }: MemberCardProps) {
  const classLabel = GUILD_CLASS_LABEL[character.guildClass];

  const card = (
    <div
      className={cn(
        "flex w-full items-center gap-2 rounded-md border bg-card px-2 py-1.5 shadow-sm",
        invalidReason && "border-destructive",
        className
      )}
    >
      <Avatar size="sm">
        <AvatarImage src={GUILD_CLASS_IMAGE[character.guildClass]} alt={classLabel} />
        <AvatarFallback>{classLabel[0]}</AvatarFallback>
      </Avatar>
      <span className="truncate text-sm font-medium">{character.name}</span>
    </div>
  );

  if (!invalidReason) return card;

  return (
    <Tooltip>
      <TooltipTrigger render={card} />
      <TooltipContent>{invalidReason}</TooltipContent>
    </Tooltip>
  );
}
