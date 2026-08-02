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
  /** Why this placement needs attention, e.g. the member dropped out */
  warning?: string;
  /** Extra classes for the outer element */
  className?: string;
}

/**
 * A guild member shown as a compact card: class avatar plus character name.
 * Purely presentational — no drag behaviour, so it can also render inside DragOverlay.
 * Always carries a tooltip: the full name, since a slot is too narrow for the
 * longer ones and truncation gives no way to read them back, or the warning
 * when there is one.
 * @param character - Character to display
 * @param warning - Why this placement needs attention, if any
 * @param className - Extra classes for the outer element
 * @returns The member card wrapped in its tooltip
 */
export function MemberCard({ character, warning, className }: MemberCardProps) {
  const classLabel = GUILD_CLASS_LABEL[character.guildClass];

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <div
            className={cn(
              "flex w-full items-center gap-2 rounded-md border bg-card px-2 py-1.5 text-left shadow-sm",
              warning && "border-destructive",
              className
            )}
          >
            <Avatar size="sm" className="shrink-0">
              <AvatarImage
                src={GUILD_CLASS_IMAGE[character.guildClass]}
                alt={classLabel}
              />
              <AvatarFallback>{classLabel[0]}</AvatarFallback>
            </Avatar>
            <span className="min-w-0 flex-1 truncate text-sm font-medium">
              {character.name}
            </span>
          </div>
        }
      />
      <TooltipContent>{warning ?? character.name}</TooltipContent>
    </Tooltip>
  );
}
