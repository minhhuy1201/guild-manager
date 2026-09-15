import { GUILD_CLASS_LABEL } from "@guild/shared/enums";
import type { Character } from "@guild/shared/schemas";
import { TriangleAlert } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { GUILD_CLASS_IMAGE, guildClassSurface } from "@/lib/guild-class";
import { cn } from "@/lib/utils";

interface MemberCardProps {
  /** Character to display */
  character: Character;
  /** Why this placement needs attention, e.g. the member dropped out */
  warning?: string;
  /** Short note shown under the name, e.g. "đang đánh trận 1" */
  note?: string;
  /** Extra classes for the outer element */
  className?: string;
}

/**
 * A guild member shown as a compact card: class avatar plus character name, on that class's colour.
 * Purely presentational — no drag behaviour, so it can also render inside DragOverlay.
 * A warning (the member dropped out of this battle) is a line of text on the card itself, under the
 * name, in place of the note: a phone has no hover to open a tooltip, so a red border alone told a
 * thumb nothing. The name wraps to two lines rather than being cut to one, and the tooltip still
 * carries it whole for a mouse.
 * @param character - Character to display
 * @param warning - Why this placement needs attention, if any
 * @param note - Short note shown under the name, if any
 * @param className - Extra classes for the outer element
 * @returns The member card wrapped in its name tooltip
 */
export function MemberCard({
  character,
  warning,
  note,
  className,
}: MemberCardProps) {
  const classLabel = GUILD_CLASS_LABEL[character.guildClass];
  const { borderColor, backgroundColor } = guildClassSurface(
    character.guildClass
  );

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <div
            className={cn(
              "flex w-full items-center gap-2 rounded-md border px-2 py-1.5 text-left shadow-sm",
              warning && "border-destructive",
              className
            )}
            // The surface always carries the class, the border only when nothing is wrong with the
            // placement: a warning owns the border, and an inline colour would outrank its class.
            style={
              warning ? { backgroundColor } : { borderColor, backgroundColor }
            }
          >
            <Avatar size="sm" className="shrink-0">
              <AvatarImage
                src={GUILD_CLASS_IMAGE[character.guildClass]}
                alt={classLabel}
              />
              <AvatarFallback>{classLabel[0]}</AvatarFallback>
            </Avatar>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="line-clamp-2 text-sm font-medium break-words">
                {character.name}
              </span>
              {warning ? (
                <span className="flex items-center gap-1 text-xs text-destructive">
                  <TriangleAlert className="size-3.5 shrink-0" aria-hidden />
                  {warning}
                </span>
              ) : note ? (
                <span className="truncate text-xs text-muted-foreground">
                  {note}
                </span>
              ) : null}
            </span>
          </div>
        }
      />
      <TooltipContent>{character.name}</TooltipContent>
    </Tooltip>
  );
}
