import { GUILD_CLASS_LABEL } from "@shared/enums";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Character } from "@/features/attendance";
import { GUILD_CLASS_IMAGE } from "@/lib/guild-class";
import { cn } from "@/lib/utils";

interface MemberCardProps {
  /** Character to display */
  character: Character;
  /** Extra classes for the outer element */
  className?: string;
}

/**
 * A guild member shown as a compact card: class avatar plus character name.
 * Purely presentational — no drag behaviour, so it can also render inside DragOverlay.
 * @param character - Character to display
 * @param className - Extra classes for the outer element
 * @returns The member card
 */
export function MemberCard({ character, className }: MemberCardProps) {
  const classLabel = GUILD_CLASS_LABEL[character.guildClass];

  return (
    <div
      className={cn(
        "flex w-full items-center gap-2 rounded-md border bg-card px-2 py-1.5 shadow-sm",
        className
      )}
    >
      <Avatar size="sm" className="shrink-0">
        <AvatarImage src={GUILD_CLASS_IMAGE[character.guildClass]} alt={classLabel} />
        <AvatarFallback>{classLabel[0]}</AvatarFallback>
      </Avatar>
      <span className="min-w-0 flex-1 truncate text-sm font-medium">
        {character.name}
      </span>
    </div>
  );
}
