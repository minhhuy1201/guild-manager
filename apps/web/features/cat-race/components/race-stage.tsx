"use client";

import { useEffectEvent, useEffect, useMemo, useState } from "react";
import { Cat, FastForward, Play, Shuffle } from "lucide-react";
import { CatRaceMode } from "@guild/shared/enums";
import type { CatRaceEventDetail, CatRacePrize } from "@guild/shared/schemas";

import { FocusModeShell } from "@/components/shared/focus-mode-shell";
import { Spinner } from "@/components/shared/spinner";
import { toastError } from "@/components/shared/toast";
import { Button } from "@/components/ui/button";
import type { FocusMode } from "@/hooks/use-focus-mode";
import { useInvalidate } from "@/hooks/use-invalidate";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useSessionRecovery } from "@/hooks/use-session-recovery";
import { cn } from "@/lib/utils";
import { errorMessageOf } from "@/lib/error-message";
import { belongsElsewhere } from "@/lib/keyboard-target";
import { Kbd } from "@/components/ui/kbd";
import { useDrawCatRaceRound } from "../hooks/use-cat-race-mutations";
import { useIdleChrome } from "../hooks/use-idle-chrome";
import { catLabels } from "../lib/cat-label";
import { PRIZE_LOCK_LABEL, prizeLockReason } from "../lib/prize-lock";
import { EMPTY_BOARD, advanceBoard, standingsAt, type BoardState } from "../lib/race-board";
import { IDLE_CLOCK, startClock, stopClock, type RaceClock } from "../lib/race-clock";
import { INITIAL_OVERLAY, applyCue } from "../lib/race-overlay";
import type { RaceCue } from "../lib/race-cue";
import { laneOrderOf } from "../lib/race-frame";
import { stageFont } from "../lib/stage-font";
import { buildRaceScript, shuffled } from "../lib/race-script";
import { RACE_END_U } from "../lib/race-timeline";
import { useRaceStore } from "../store/race-store";
import { RaceBroadcastBar } from "./race-broadcast-bar";
import { RacePrizePicker } from "./race-prize-picker";
import { RaceCanvas } from "./race-canvas";
import { RaceOverlays } from "./race-overlays";
import { RaceResultOverlay } from "./race-result-overlay";
import { RaceStandings } from "./race-standings";

/** The overlay's top bar: stage colours, dark so the shell's exit button reads on it. */
const FOCUS_BAR_CLASS =
  "dark flex shrink-0 items-center gap-3 border-b border-[color:var(--stage-line)] bg-gradient-to-r from-[color:var(--stage-wood)] to-[color:var(--stage-bar-end)] px-4 py-3 text-[color:var(--stage-paper)]";

/** Any positive number: a preview paints the start line only. */
const RACE_PREVIEW_SECONDS = 1;

interface RaceStageProps {
  event: CatRaceEventDetail;
  /** Prize the next round is for */
  prize: CatRacePrize | undefined;
  /** False while the duration field holds something out of range; locks ĐUA */
  isDurationValid: boolean;
  /** The screen's focus mode: while active the stage covers the window in place */
  focus: Pick<FocusMode, "active" | "exit">;
  /** Chooses the prize for the next round; the focus mode's picker calls it */
  onSelectPrize: (prizeId: string) => void;
}

/**
 * The race area: the track with the cats on the start line while idle, the replay while racing, the
 * winner card after.
 * The server answers first and the canvas replays that answer; "Bỏ qua" and reduced motion just
 * jump to the card.
 * @param event - The event
 * @param prize - Prize the next round is for
 * @param isDurationValid - Whether the typed duration is in range
 * @param focus - The focus mode's flag and its exit
 * @param onSelectPrize - Chooses the prize for the next round
 * @returns The race area
 */
export function RaceStage({
  event,
  prize,
  isDurationValid,
  focus,
  onSelectPrize,
}: RaceStageProps) {
  const { stage, durationSeconds, pendingResult, laneOrder } = useRaceStore();
  const store = useRaceStore.getState;
  const draw = useDrawCatRaceRound();
  const invalidate = useInvalidate("cat-race");
  const recoverSession = useSessionRecovery();
  const reducedMotion = useReducedMotion();
  const [skipSignal, setSkipSignal] = useState(0);
  const [standings, setStandings] = useState<BoardState>(EMPTY_BOARD);
  const [clock, setClock] = useState<RaceClock>(IDLE_CLOCK);
  const [isContinuing, setIsContinuing] = useState(false);
  const [overlay, setOverlay] = useState(INITIAL_OVERLAY);

  const isFocused = focus.active;
  const { idle, wake } = useIdleChrome(isFocused && stage === "racing");

  const skip = () => setSkipSignal((n) => n + 1);

  const handleSkipKey = useEffectEvent((event: KeyboardEvent) => {
    if (stage !== "racing" || event.key.toLowerCase() !== "s") return;
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
    if (belongsElsewhere(event.target)) return;

    skip();
  });

  useEffect(() => {
    window.addEventListener("keydown", handleSkipKey);
    return () => window.removeEventListener("keydown", handleSkipKey);
  }, []);

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
  const board: BoardState =
    standings.rows.length === 0 && stage === "result" && script
      ? { rows: standingsAt(script, RACE_END_U, null), previousKeys: [] }
      : standings;

  const startRound = async () => {
    if (!prize || lock || stage !== "idle" || !isDurationValid) return;
    setStandings(EMPTY_BOARD);
    setClock(IDLE_CLOCK);
    setOverlay(INITIAL_OVERLAY);
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
      toastError(errorMessageOf(error, "Không đua được vòng này."));
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
    setClock((current) => stopClock(current, performance.now()));
    if (pendingResult) store().showResult(pendingResult);
  };

  const showCue = (cue: RaceCue) => {
    const now = performance.now();
    setOverlay((current) => applyCue(current, cue, now));
    if (cue.kind === "go") setClock(startClock(now));
    if (cue.kind === "finish") setClock((current) => stopClock(current, now));
  };

  const continueRacing = async () => {
    setIsContinuing(true);
    try {
      await invalidate();
    } finally {
      setIsContinuing(false);
      store().reset();
      setClock(IDLE_CLOCK);
    }
  };

  const bar = prize ? (
    <RaceBroadcastBar
      prize={prize}
      entrantCount={entrantCount}
      ticketCount={event.mode === CatRaceMode.TICKET ? ticketCount : null}
      isLive={stage === "racing"}
      clock={clock}
      size={isFocused ? "focus" : "default"}
      tierSlot={
        isFocused ? (
          <RacePrizePicker
            event={event}
            prize={prize}
            disabled={stage !== "idle"}
            onSelect={onSelectPrize}
          />
        ) : undefined
      }
      className={stageFont.variable}
    />
  ) : null;

  // Shown under the track, or floating on it in focus mode: one definition for both places.
  const controls = (
    <div className="flex flex-col items-center gap-2">
      {stage === "racing" ? (
        <Button type="button" variant="outline" onClick={skip}>
          <FastForward />
          Bỏ qua
          <Kbd aria-hidden>S</Kbd>
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
  );

  return (
    <FocusModeShell
      active={isFocused}
      label="Đua mèo toàn màn hình"
      bar={bar}
      barClassName={FOCUS_BAR_CLASS}
      onExit={focus.exit}
      className="flex flex-col gap-4 rounded-container border border-border bg-card p-4"
      activeClassName={cn("bg-[color:var(--stage-night)]", idle && "cursor-none")}
      hideExit={idle}
      activeSlot="cat-race-focus"
    >
      {isFocused ? null : bar}
      <div
        className={cn(
          "grid gap-4",
          isFocused
            ? "min-h-0 flex-1 p-4 max-lg:overflow-y-auto lg:grid-cols-[minmax(0,1fr)_clamp(16rem,20vw,22rem)] lg:grid-rows-[minmax(0,1fr)]"
            : "lg:grid-cols-[minmax(0,1fr)_17rem]"
        )}
      >
        <div
          data-slot="cat-race-stage"
          className={cn(
            "relative h-[70dvh] min-h-96 overflow-hidden rounded-lg",
            isFocused && "lg:h-auto lg:min-h-0",
            stageFont.variable
          )}
        >
          {stage === "result" && script ? (
            <RaceCanvas
              mode="finish"
              script={script}
              participants={event.participants}
              skipSignal={skipSignal}
              laneOrder={laneKeys}
              onFinish={finishRace}
              onStandings={(rows) => setStandings((current) => advanceBoard(current, rows))}
              onCue={showCue}
            />
          ) : stage === "racing" && script ? (
            <RaceCanvas
              script={script}
              participants={event.participants}
              skipSignal={skipSignal}
              laneOrder={laneKeys}
              onFinish={finishRace}
              onStandings={(rows) => setStandings((current) => advanceBoard(current, rows))}
              onCue={showCue}
            />
          ) : stage !== "result" && previewScript ? (
            <RaceCanvas
              mode="start"
              script={previewScript}
              participants={event.participants}
              skipSignal={skipSignal}
              laneOrder={laneKeys}
              onFinish={finishRace}
              onStandings={(rows) => setStandings((current) => advanceBoard(current, rows))}
              onCue={showCue}
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
          {stage === "racing" && script ? (
            <RaceOverlays state={overlay} script={script} participants={event.participants} />
          ) : null}
          {stage === "result" && pendingResult ? (
            <RaceResultOverlay
              event={event}
              prize={event.prizes.find((p) => p.id === pendingResult.round.prizeId)}
              result={pendingResult}
              script={script}
              isContinuing={isContinuing}
              onContinue={() => void continueRacing()}
            />
          ) : null}
          {isFocused && stage !== "result" ? (
            <div
              data-slot="cat-race-plate"
              data-idle={idle ? "" : undefined}
              onFocusCapture={wake}
              className={cn(
                "pointer-events-none absolute inset-x-0 bottom-5 flex justify-center px-4 transition-opacity duration-[var(--duration-base)] ease-out-soft",
                idle && "opacity-0"
              )}
            >
              <div className={cn("dark flex flex-col items-center gap-2 rounded-container border border-white/10 bg-[color:var(--stage-plate)]/70 p-3 shadow-[0_12px_32px_-8px_rgb(0_0_0/0.6)] backdrop-blur-md", idle ? "pointer-events-none" : "pointer-events-auto")}>
                {controls}
              </div>
            </div>
          ) : null}
        </div>
        <RaceStandings
          script={stage === "racing" || stage === "result" ? script : null}
          participants={event.participants}
          board={board}
          className={cn(
            "max-h-80 lg:max-h-none",
            isFocused ? "lg:h-auto lg:min-h-0" : "lg:h-[70dvh] lg:min-h-96",
            stageFont.variable
          )}
        />
      </div>

      {isFocused ? null : controls}
    </FocusModeShell>
  );
}
