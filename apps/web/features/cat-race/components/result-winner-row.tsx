import type { CatRaceParticipant, CatRaceRound } from "@guild/shared/schemas";

import { GuildClassIcon } from "@/components/shared/guild-class-icon";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { discordAvatarUrl } from "@/features/auth";
import { formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";

interface ResultWinnerRowProps {
  round: CatRaceRound;
  /** The winner's entry in the event, for the Discord avatar; absent when they left the list */
  participant: CatRaceParticipant | undefined;
  /** The top tier gets a larger avatar */
  isFeatured: boolean;
}

/**
 * One winner on the results board. A voided round stays, struck through, with its reason in words.
 * @param round - The round
 * @param participant - The winner's entry in the event
 * @param isFeatured - Whether the row sits in the top tier's block
 * @returns The row
 */
export function ResultWinnerRow({ round, participant, isFeatured }: ResultWinnerRowProps) {
  const avatarUrl = participant?.discordId
    ? discordAvatarUrl(participant.discordId, participant.discordAvatar)
    : null;
  const isVoided = round.voidedAt !== null;

  return (
    <li className="flex items-center gap-3 rounded-inner bg-card px-3 py-2">
      <Avatar size={isFeatured ? "lg" : "default"}>
        {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
        <AvatarFallback>{round.winnerName.slice(0, 1).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2">
          <GuildClassIcon guildClass={round.winnerGuildClass} />
          <span
            className={cn(
              "truncate",
              isFeatured && "font-heading text-lg font-semibold",
              isVoided && "text-muted-foreground line-through"
            )}
          >
            {round.winnerName}
          </span>
        </p>
        {isVoided ? (
          <p className="text-sm text-muted-foreground">Đã huỷ: {round.voidReason}</p>
        ) : null}
      </div>
      <time dateTime={round.drawnAt} className="shrink-0 text-sm text-muted-foreground tabular-nums">
        {formatTime(round.drawnAt)}
      </time>
    </li>
  );
}
