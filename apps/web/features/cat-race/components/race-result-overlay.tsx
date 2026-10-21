"use client";

import { useEffect } from "react";
import { GUILD_CLASS_LABEL, PRIZE_TIER_LABEL, PrizeTier } from "@guild/shared/enums";
import type {
  CatRaceDrawResult,
  CatRaceEventDetail,
  CatRacePrize,
} from "@guild/shared/schemas";

import { Spinner } from "@/components/shared/spinner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { discordAvatarUrl } from "@/features/auth";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";
import { catLabels } from "../lib/cat-label";
import { PRIZE_TIER_ICON } from "../lib/prize-tier-style";
import { podiumOf } from "../lib/race-podium";
import { isUnderdog, oddsText } from "../lib/race-odds";
import { rankAt, type RaceScript } from "../lib/race-script";
import { RACE_END_U } from "../lib/race-timeline";
import { confettiPlan } from "../lib/result-confetti";

/** The tier of the card when the prize is gone from the event: the plainest one. */
const FALLBACK_TIER = PrizeTier.LOW;

interface RaceResultOverlayProps {
  event: CatRaceEventDetail;
  prize: CatRacePrize | undefined;
  result: CatRaceDrawResult;
  /** The race that was replayed, for places two and three; null leaves the podium out */
  script: RaceScript | null;
  isContinuing: boolean;
  onContinue: () => void;
}

/**
 * The winner card that closes a round: it builds up line by line in the colour of the prize tier,
 * with tier-sized confetti unless the viewer asked for less motion. Sits inside the stage root,
 * which owns the palette and the display font.
 * @param event - The event, for the winner's avatar and the mode
 * @param prize - The prize that was drawn
 * @param result - The server's answer
 * @param script - The race that was replayed
 * @param isContinuing - Whether the refresh behind "Đua tiếp" is running
 * @param onContinue - Back to the race screen
 * @returns The overlay
 */
export function RaceResultOverlay({
  event,
  prize,
  result,
  script,
  isContinuing,
  onContinue,
}: RaceResultOverlayProps) {
  const reducedMotion = useReducedMotion();
  const { round } = result;
  const tier = prize?.tier ?? FALLBACK_TIER;
  const TierIcon = PRIZE_TIER_ICON[tier];
  const winner = event.participants.find((p) => p.characterId === round.winnerCharacterId);
  const avatarUrl = winner?.discordId
    ? discordAvatarUrl(winner.discordId, winner.discordAvatar)
    : null;
  const odds = {
    mode: event.mode,
    winnerTickets: round.winnerTickets,
    totalTickets: round.totalTickets,
    entrantCount: round.entrantCount,
  };
  // The finished race ranks the same whether or not the replay ran, so reduced motion needs no
  // board to read from.
  const podium = script
    ? podiumOf(rankAt(script, RACE_END_U), catLabels(script.cats, event.participants))
    : [];

  useEffect(() => {
    if (reducedMotion) return;
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    void import("canvas-confetti").then(({ default: confetti }) => {
      if (cancelled) return;
      for (const { delayMs, options } of confettiPlan(tier)) {
        if (delayMs === 0) void confetti(options);
        else timers.push(setTimeout(() => void confetti(options), delayMs));
      }
    });

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [reducedMotion, tier]);

  return (
    <div className="race-result">
      <div className="race-card" data-tier={tier}>
        <p className="race-tierline race-display">
          <TierIcon aria-hidden className="size-4" />
          <span>
            {prize
              ? `GIẢI ${PRIZE_TIER_LABEL[tier].toUpperCase()} · ${prize.name}`
              : `GIẢI ${PRIZE_TIER_LABEL[tier].toUpperCase()}`}
          </span>
        </p>
        <div className="race-winner">
          <Avatar size="lg">
            {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
            <AvatarFallback>{round.winnerName.slice(0, 1).toUpperCase()}</AvatarFallback>
          </Avatar>
          <p className="race-winner-name race-display">{round.winnerName}</p>
        </div>
        <p className="race-class">
          {GUILD_CLASS_LABEL[round.winnerGuildClass]}
          {round.winnerTickets > 1 ? ` · mèo #${result.winningTicket}` : ""}
        </p>
        <p className="race-odds">{oddsText(odds)}</p>
        <div className="race-podium">
          {podium.map(({ place, label }) => (
            <span key={place}>
              {place}. <b>{label}</b>
            </span>
          ))}
        </div>
        <Button
          type="button"
          disabled={isContinuing}
          onClick={onContinue}
          className={cn(
            "race-display h-auto rounded-sm border-(--stage-lacquer-light) bg-(--stage-lacquer) px-5 pt-2.5 pb-2 text-lg",
            "text-(--stage-paper) shadow-[0_4px_0_var(--stage-lacquer-deep)] hover:bg-(--stage-lacquer-hover)"
          )}
        >
          {isContinuing ? <Spinner size="sm" /> : null}
          Đua tiếp
        </Button>
        {isUnderdog(odds) ? <p className="race-stamp race-display">KÈO DƯỚI</p> : null}
      </div>
    </div>
  );
}
