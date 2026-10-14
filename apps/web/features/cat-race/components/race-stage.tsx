"use client";

import { useMemo, useState } from "react";
import { Cat, FastForward, Play, Timer } from "lucide-react";
import type { CatRaceEventDetail, CatRacePrize } from "@guild/shared/schemas";

import { FieldLabel } from "@/components/shared/field-label";
import { Spinner } from "@/components/shared/spinner";
import { toastError } from "@/components/shared/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useInvalidate } from "@/hooks/use-invalidate";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useSessionRecovery } from "@/hooks/use-session-recovery";
import { errorMessageOf } from "@/lib/error-message";
import { useDrawCatRaceRound } from "../hooks/use-cat-race-mutations";
import { PRIZE_LOCK_LABEL, prizeLockReason } from "../lib/prize-lock";
import {
  RACE_DURATION_ERROR,
  RACE_DURATION_MAX_SECONDS,
  RACE_DURATION_MIN_SECONDS,
  parseRaceDuration,
} from "../lib/race-duration";
import { buildRaceScript } from "../lib/race-script";
import { useRaceStore } from "../store/race-store";
import { RaceCanvas } from "./race-canvas";
import { RaceResultOverlay } from "./race-result-overlay";
import { RaceStandings } from "./race-standings";

interface RaceStageProps {
  event: CatRaceEventDetail;
  /** Prize the next round is for */
  prize: CatRacePrize | undefined;
  /** Opens the entrants dialog */
  onEditEntrants: () => void;
  /** Opens the participants dialog */
  onEditParticipants: () => void;
  canEdit: boolean;
}

/**
 * The race area: counts and controls while idle, the canvas while racing, the winner card after.
 * The server answers first and the canvas replays that answer; "Bỏ qua" and reduced motion just
 * jump to the card.
 * @param event - The event
 * @param prize - Prize the next round is for
 * @param onEditEntrants - Opens the entrants dialog
 * @param onEditParticipants - Opens the participants dialog
 * @param canEdit - Whether the edit buttons show
 * @returns The race area
 */
export function RaceStage({
  event,
  prize,
  onEditEntrants,
  onEditParticipants,
  canEdit,
}: RaceStageProps) {
  const { stage, durationSeconds, pendingResult } = useRaceStore();
  const store = useRaceStore.getState;
  const draw = useDrawCatRaceRound();
  const invalidate = useInvalidate("cat-race");
  const recoverSession = useSessionRecovery();
  const reducedMotion = useReducedMotion();
  const [skipSignal, setSkipSignal] = useState(0);
  const [standings, setStandings] = useState<string[]>([]);
  const [durationText, setDurationText] = useState(String(durationSeconds));
  const [isContinuing, setIsContinuing] = useState(false);

  const lock = prize ? prizeLockReason(prize, event.status) : null;
  const entrantCount = prize?.entrantIds.length ?? 0;
  const ticketCount = event.participants
    .filter((p) => prize?.entrantIds.includes(p.characterId))
    .reduce((sum, p) => sum + p.tickets, 0);

  const script = useMemo(() => {
    const winnerId = pendingResult?.round.winnerCharacterId;
    if (!pendingResult || !winnerId) return null;

    return buildRaceScript({
      entrants: pendingResult.entrants,
      winner: { characterId: winnerId, ticketNo: pendingResult.winningTicket },
      durationSeconds,
      random: Math.random,
    });
  }, [pendingResult, durationSeconds]);

  const typedDuration = parseRaceDuration(durationText);
  const changeDuration = (text: string) => {
    setDurationText(text);
    const seconds = parseRaceDuration(text);
    if (seconds !== null) store().setDurationSeconds(seconds);
  };

  const startRound = async () => {
    if (!prize || lock || stage !== "idle" || typedDuration === null) return;
    setStandings([]);
    store().startDrawing();
    try {
      const result = await draw.mutateAsync({ id: event.id, prizeId: prize.id });
      // The screen was left while the server answered: the round is stored, so refresh the winners
      // and leave the shared store alone for whichever event opens next.
      if (store().stage !== "drawing") {
        void invalidate();
        return;
      }
      if (reducedMotion) store().showResult(result);
      else store().startRacing(result);
    } catch (error) {
      store().reset();
      if (recoverSession(error)) return;
      toastError(errorMessageOf(error, "Không quay được vòng này."));
    }
  };

  const finishRace = () => {
    if (pendingResult) store().showResult(pendingResult);
  };

  const continueRacing = async () => {
    setIsContinuing(true);
    try {
      await invalidate();
    } finally {
      setIsContinuing(false);
      store().reset();
    }
  };

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="relative h-[70dvh] min-h-96">
          {stage === "racing" && script ? (
            <RaceCanvas
              script={script}
              participants={event.participants}
              skipSignal={skipSignal}
              onFinish={finishRace}
              onStandings={setStandings}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 rounded-lg border border-border bg-background text-center">
              {/* The winner card sits on this frame, so the counts must not bleed through it. */}
              {stage === "result" ? null : (
                <>
                  <Cat className="size-12 text-muted-foreground" />
                  <p className="text-lg font-medium">
                    {entrantCount} người
                    {event.mode === "TICKET" ? ` · ${ticketCount} vé` : ""}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {prize ? `Hạng mục: ${prize.name}` : "Chưa có hạng mục."}
                  </p>
                </>
              )}
            </div>
          )}
          {stage === "result" && pendingResult ? (
            <RaceResultOverlay
              event={event}
              prize={event.prizes.find((p) => p.id === pendingResult.round.prizeId)}
              result={pendingResult}
              isContinuing={isContinuing}
              onContinue={() => void continueRacing()}
            />
          ) : null}
        </div>
        <RaceStandings
          script={stage === "racing" || stage === "result" ? script : null}
          participants={event.participants}
          keys={standings}
          className="max-h-80 lg:h-[70dvh] lg:max-h-none lg:min-h-96"
        />
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-1">
          <FieldLabel htmlFor="cat-race-duration" icon={<Timer />}>
            Thời gian đua (giây)
          </FieldLabel>
          <Input
            id="cat-race-duration"
            type="number"
            inputMode="numeric"
            min={RACE_DURATION_MIN_SECONDS}
            max={RACE_DURATION_MAX_SECONDS}
            step={1}
            className="w-28"
            value={durationText}
            // A new duration would rebuild the script and restart the replay mid-race.
            disabled={stage !== "idle"}
            aria-invalid={typedDuration === null}
            onChange={(event) => changeDuration(event.target.value)}
          />
          <p className="min-h-5 text-sm text-destructive">
            {typedDuration === null ? RACE_DURATION_ERROR : ""}
          </p>
        </div>
        {canEdit ? (
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" disabled={!prize || stage !== "idle"} onClick={onEditEntrants}>
              Danh sách đua {entrantCount}
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={stage !== "idle"} onClick={onEditParticipants}>
              Người tham gia {event.participants.length}
            </Button>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col items-center gap-2">
        {stage === "racing" ? (
          <Button type="button" variant="outline" onClick={() => setSkipSignal((n) => n + 1)}>
            <FastForward />
            Bỏ qua
          </Button>
        ) : (
          <Button
            type="button"
            size="lg"
            disabled={!prize || lock !== null || stage !== "idle" || typedDuration === null}
            onClick={() => void startRound()}
          >
            {stage === "drawing" ? <Spinner size="sm" /> : <Play />}
            {prize ? `ĐUA: ${prize.name} #${prize.awardedCount + 1}` : "ĐUA"}
          </Button>
        )}
        {lock ? (
          <p className="text-sm text-muted-foreground">{PRIZE_LOCK_LABEL[lock]}</p>
        ) : null}
      </div>
    </section>
  );
}
