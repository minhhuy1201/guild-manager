"use client";

import { useEffect } from "react";
import { GUILD_CLASS_LABEL, CatRaceMode } from "@guild/shared/enums";
import type {
  CatRaceDrawResult,
  CatRaceEventDetail,
  CatRacePrize,
} from "@guild/shared/schemas";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { discordAvatarUrl } from "@/features/auth";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { REVEAL_CLASS } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { PRIZE_TIER_CLASS } from "../lib/prize-tier-style";
import { PrizeTierBadge } from "./prize-tier-badge";
import { Spinner } from "@/components/shared/spinner";

interface RaceResultOverlayProps {
  event: CatRaceEventDetail;
  prize: CatRacePrize | undefined;
  result: CatRaceDrawResult;
  isContinuing: boolean;
  onContinue: () => void;
}

/**
 * The winner card that closes a round, with confetti unless the viewer asked for less motion.
 * @param event - The event, for the winner's avatar and the mode
 * @param prize - The prize that was drawn
 * @param result - The server's answer
 * @param isContinuing - Whether the refresh behind "Đua tiếp" is running
 * @param onContinue - Back to the race screen
 * @returns The overlay
 */
export function RaceResultOverlay({
  event,
  prize,
  result,
  isContinuing,
  onContinue,
}: RaceResultOverlayProps) {
  const reducedMotion = useReducedMotion();
  const { round } = result;
  const winner = event.participants.find((p) => p.characterId === round.winnerCharacterId);
  const avatarUrl = winner?.discordId
    ? discordAvatarUrl(winner.discordId, winner.discordAvatar)
    : null;

  useEffect(() => {
    if (reducedMotion) return;
    let cancelled = false;
    void import("canvas-confetti").then(({ default: confetti }) => {
      if (!cancelled) void confetti({ particleCount: 140, spread: 80, origin: { y: 0.6 } });
    });

    return () => {
      cancelled = true;
    };
  }, [reducedMotion]);

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/70 p-4">
      <div
        className={cn(
          REVEAL_CLASS,
          "flex w-full max-w-sm flex-col items-center gap-3 rounded-xl border-2 bg-card p-6 text-center",
          prize ? PRIZE_TIER_CLASS[prize.tier] : "border-border"
        )}
      >
        <Avatar size="lg">
          {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
          <AvatarFallback>{round.winnerName.slice(0, 1).toUpperCase()}</AvatarFallback>
        </Avatar>
        <p className="font-heading text-2xl">{round.winnerName}</p>
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          {prize ? <PrizeTierBadge tier={prize.tier} className="size-6" /> : null}
          <span>
            {GUILD_CLASS_LABEL[round.winnerGuildClass]}
            {prize ? ` · ${prize.name}` : ""}
          </span>
        </p>
        <p className="text-sm text-muted-foreground">
          {event.mode === CatRaceMode.TICKET
            ? `Thắng với ${round.winnerTickets}/${round.totalTickets} vé`
            : `Thắng giữa ${round.entrantCount} người`}
        </p>
        <Button type="button" disabled={isContinuing} onClick={onContinue}>
          {isContinuing ? <Spinner size="sm" /> : null}
          Đua tiếp
        </Button>
      </div>
    </div>
  );
}
