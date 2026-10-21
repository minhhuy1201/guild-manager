"use client";

import { useMemo, useState } from "react";
import { Cat, FastForward, Play, Shuffle } from "lucide-react";
import { CatRaceMode } from "@guild/shared/enums";
import type { CatRaceEventDetail, CatRacePrize } from "@guild/shared/schemas";

import { Spinner } from "@/components/shared/spinner";
import { toastError } from "@/components/shared/toast";
import { Button } from "@/components/ui/button";
import { useInvalidate } from "@/hooks/use-invalidate";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useSessionRecovery } from "@/hooks/use-session-recovery";
import { errorMessageOf } from "@/lib/error-message";
import { useDrawCatRaceRound } from "../hooks/use-cat-race-mutations";
import { catLabels } from "../lib/cat-label";
import { PRIZE_LOCK_LABEL, prizeLockReason } from "../lib/prize-lock";
import { laneOrderOf } from "../lib/race-frame";
import { buildRaceScript, rankAt, shuffled } from "../lib/race-script";
import { RACE_END_U } from "../lib/race-timeline";
import { useRaceStore } from "../store/race-store";
import { RaceCanvas } from "./race-canvas";
import { RaceResultOverlay } from "./race-result-overlay";
import { RaceStandings } from "./race-standings";

/** Any positive number: a preview paints the start line only. */
const RACE_PREVIEW_SECONDS = 1;

interface RaceStageProps {
  event: CatRaceEventDetail;
  /** Prize the next round is for */
  prize: CatRacePrize | undefined;
  /** False while the duration field holds something out of range; locks ĐUA */
  isDurationValid: boolean;
}

/**
 * The race area: the track with the cats on the start line while idle, the replay while racing, the
 * winner card after.
 * The server answers first and the canvas replays that answer; "Bỏ qua" and reduced motion just
 * jump to the card.
 * @param event - The event
 * @param prize - Prize the next round is for
 * @param isDurationValid - Whether the typed duration is in range
 * @returns The race area
 */
export function RaceStage({
  event,
  prize,
  isDurationValid,
}: RaceStageProps) {
  const { stage, durationSeconds, pendingResult, laneOrder } = useRaceStore();
  const store = useRaceStore.getState;
  const draw = useDrawCatRaceRound();
  const invalidate = useInvalidate("cat-race");
  const recoverSession = useSessionRecovery();
  const reducedMotion = useReducedMotion();
  const [skipSignal, setSkipSignal] = useState(0);
  const [standings, setStandings] = useState<string[]>([]);
  const [isContinuing, setIsContinuing] = useState(false);

  const lock = prize ? prizeLockReason(prize, event.status) : null;
  const entrants = useMemo(
    () =>
      event.participants
        .filter((p) => prize?.entrantIds.includes(p.characterId))
        .map((p) => ({ characterId: p.characterId, tickets: p.tickets })),
    [event.participants, prize]
  );

  const entrantCount = entrants.length;
  const ticketCount = entrants.reduce((sum, p) => sum + p.tickets, 0);

  // The cats stand on the start line before the first round. The winner and the duration are
  // placeholders: a preview never moves, so neither shows.
  const previewScript = useMemo(() => {
    const first = entrants[0];
    if (!first) return null;

    return buildRaceScript({
      entrants,
      winner: { characterId: first.characterId, ticketNo: 1 },
      durationSeconds: RACE_PREVIEW_SECONDS,
      random: Math.random,
    });
  }, [entrants]);

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

  // Reduced motion skips the replay, so no board update ever came: rank the finished race instead.
  const board =
    standings.length === 0 && stage === "result" && script
      ? rankAt(script, RACE_END_U)
      : standings;

  const startRound = async () => {
    if (!prize || lock || stage !== "idle" || !isDurationValid) return;
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

  // Another prize has another field, so a shuffle made for a different prize means nothing here.
  const laneKeys = prize && laneOrder?.prizeId === prize.id ? laneOrder.keys : null;

  const canShuffle = stage === "idle" && (previewScript?.cats.length ?? 0) >= 2;

  const shuffleLanes = () => {
    if (!prize || !previewScript || !canShuffle) return;
    const keys = previewScript.cats.map((cat) => cat.key);
    const shown = laneOrderOf(
      previewScript,
      catLabels(previewScript.cats, event.participants),
      laneKeys
    );
    let next = shuffled(keys, Math.random);
    // A click that lands on the lanes already shown looks like a dead button.
    while (next.every((key, index) => key === shown[index])) {
      next = shuffled(keys, Math.random);
    }
    store().shuffleLanes(prize.id, next);
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
      {prize ? (
        <p className="text-sm text-muted-foreground">
          Hạng mục: {prize.name} · {entrantCount} người
          {event.mode === CatRaceMode.TICKET ? ` · ${ticketCount} vé` : ""}
        </p>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="relative h-[70dvh] min-h-96">
          {stage === "racing" && script ? (
            <RaceCanvas
              script={script}
              participants={event.participants}
              skipSignal={skipSignal}
              laneOrder={laneKeys}
              onFinish={finishRace}
              onStandings={setStandings}
            />
          ) : stage !== "result" && previewScript ? (
            <RaceCanvas
              isPreview
              script={previewScript}
              participants={event.participants}
              skipSignal={skipSignal}
              laneOrder={laneKeys}
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
                    {prize ? "Chưa có ai trong danh sách đua." : "Chưa có hạng mục."}
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
          keys={board}
          className="max-h-80 lg:h-[70dvh] lg:max-h-none lg:min-h-96"
        />
      </div>

      <div className="flex flex-col items-center gap-2">
        {stage === "racing" ? (
          <Button type="button" variant="outline" onClick={() => setSkipSignal((n) => n + 1)}>
            <FastForward />
            Bỏ qua
          </Button>
        ) : (
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="lg"
              disabled={!canShuffle}
              onClick={shuffleLanes}
            >
              <Shuffle />
              Xáo trộn
            </Button>
            <Button
              type="button"
              size="lg"
              disabled={!prize || lock !== null || stage !== "idle" || !isDurationValid}
              onClick={() => void startRound()}
            >
              {stage === "drawing" ? <Spinner size="sm" /> : <Play />}
              {prize ? `ĐUA: ${prize.name} #${prize.awardedCount + 1}` : "ĐUA"}
            </Button>
          </div>
        )}
        {lock ? (
          <p className="text-sm text-muted-foreground">{PRIZE_LOCK_LABEL[lock]}</p>
        ) : null}
      </div>
    </section>
  );
}
