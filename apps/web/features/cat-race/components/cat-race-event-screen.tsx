"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  CatRaceEventDetail,
  CatRacePrize,
  CatRaceRound,
} from "@guild/shared/schemas";

import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { QueryBoundary } from "@/components/shared/query-boundary";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Skeleton } from "@/components/ui/skeleton";
import { useCharacters } from "@/features/attendance";
import { useFocusMode } from "@/hooks/use-focus-mode";
import { useInvalidate } from "@/hooks/use-invalidate";
import { combineQueries } from "@/lib/query-group";
import { useDeleteCatRacePrize } from "../hooks/use-cat-race-mutations";
import { useCatRaceEvent } from "../hooks/use-cat-races";
import { parseRaceDuration } from "../lib/race-duration";
import { prizeLockReason } from "../lib/prize-lock";
import { useRaceStore } from "../store/race-store";
import { CatRaceEndedScreen } from "./cat-race-ended-screen";
import { CatRaceHeader } from "./cat-race-header";
import { EndEventButton } from "./end-event-button";
import { FeatureRaceSwitch } from "./feature-race-switch";
import { EntrantsDialog } from "./entrants-dialog";
import { ParticipantsDialog } from "./participants-dialog";
import { PrizeChips } from "./prize-chips";
import { PrizeFormDialog } from "./prize-form-dialog";
import { RaceControls } from "./race-controls";
import { RaceStage } from "./race-stage";
import { VoidRoundDialog } from "./void-round-dialog";
import { WinnersPanel } from "./winners-panel";

interface CatRaceEventScreenProps {
  id: string;
}

/**
 * The draw screen of one event.
 * @param id - Event id from the route
 * @returns The event screen
 */
export function CatRaceEventScreen({ id }: CatRaceEventScreenProps) {
  const eventQuery = useCatRaceEvent(id);
  const state = combineQueries([eventQuery], "Không tải được đợt đua.");

  return (
    <QueryBoundary
      state={state}
      skeleton={<Skeleton className="h-96 w-full" />}
    >
      {eventQuery.data ? (
        eventQuery.data.status === "ENDED" ? (
          <CatRaceEndedScreen event={eventQuery.data} />
        ) : (
          <EventBody event={eventQuery.data} />
        )
      ) : null}
    </QueryBoundary>
  );
}

/** Which dialog is open; one at a time. */
type OpenDialog =
  | { kind: "none" }
  | { kind: "participants" }
  | { kind: "entrants" }
  | { kind: "prize"; prize: CatRacePrize | null }
  | { kind: "delete-prize"; prize: CatRacePrize };

/**
 * The loaded open event: header, prize chips, race area and winners.
 * @param event - The event
 * @returns The screen body
 */
function EventBody({ event }: { event: CatRaceEventDetail }) {
  const { selectedPrizeId, selectPrize, stage, durationSeconds, setDurationSeconds } =
    useRaceStore();
  const charactersQuery = useCharacters();
  const deletePrize = useDeleteCatRacePrize();
  const [dialog, setDialog] = useState<OpenDialog>({ kind: "none" });
  const [voiding, setVoiding] = useState<CatRaceRound | null>(null);
  const [durationText, setDurationText] = useState(String(durationSeconds));
  const invalidate = useInvalidate("cat-race");
  const focusButtonRef = useRef<HTMLButtonElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const focusReturn = useMemo(
    () => ({ button: focusButtonRef, fallback: bodyRef }),
    []
  );
  const focus = useFocusMode(true, false, focusReturn);

  // The store outlives this screen. Leaving mid-race or on the winner card must not replay that
  // round on the next event, and a round drawn but never shown to the end still needs the winners
  // list refreshed.
  useEffect(() => {
    return () => {
      const { pendingResult } = useRaceStore.getState();
      useRaceStore.setState({
        stage: "idle",
        pendingResult: null,
        selectedPrizeId: null,
        laneOrder: null,
      });
      if (pendingResult) void invalidate();
    };
  }, [event.id, invalidate]);

  const isBusy = stage !== "idle";
  const selected =
    event.prizes.find((prize) => prize.id === selectedPrizeId) ??
    event.prizes.find((prize) => !prizeLockReason(prize, event.status)) ??
    event.prizes[0];
  const choosePrize = (prizeId: string) => {
    if (!isBusy) selectPrize(prizeId);
  };
  const close = () => setDialog({ kind: "none" });
  const isDurationValid = parseRaceDuration(durationText) !== null;
  const changeDuration = (text: string) => {
    setDurationText(text);
    const seconds = parseRaceDuration(text);
    if (seconds !== null) setDurationSeconds(seconds);
  };

  return (
    <div ref={bodyRef} tabIndex={-1} className="flex flex-col gap-4 outline-none">
      {/* While focus mode is on, the siblings of the stage hide in their own slots: the stage keeps
          its position in this list, so it never remounts and a running race goes on. */}
      {focus.active ? null : (
        <CatRaceHeader
          event={event}
          actions={
            <>
              <Button
                ref={focusButtonRef}
                type="button"
                variant="outline"
                className="hidden lg:inline-flex"
                onClick={focus.enter}
              >
                Toàn màn hình
                <Kbd aria-hidden>F</Kbd>
              </Button>
              <EndEventButton eventId={event.id} disabled={isBusy} />
            </>
          }
        />
      )}

      {focus.active ? null : <FeatureRaceSwitch event={event} />}

      {focus.active ? null : (
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
          <PrizeChips
            event={event}
            selectedPrizeId={selected?.id ?? null}
            canEdit={!isBusy}
            onSelect={(prize) => choosePrize(prize.id)}
            onEdit={(prize) => setDialog({ kind: "prize", prize })}
            onDelete={(prize) => setDialog({ kind: "delete-prize", prize })}
            onAdd={() => setDialog({ kind: "prize", prize: null })}
          />
          <RaceControls
            durationText={durationText}
            onDurationTextChange={changeDuration}
            isDurationValid={isDurationValid}
            isLocked={isBusy}
            hasPrize={selected !== undefined}
            entrantCount={selected?.entrantIds.length ?? 0}
            participantCount={event.participants.length}
            onEditEntrants={() => setDialog({ kind: "entrants" })}
            onEditParticipants={() => setDialog({ kind: "participants" })}
          />
        </div>
      )}

      <RaceStage
        event={event}
        prize={selected}
        isDurationValid={isDurationValid}
        focus={focus}
        onSelectPrize={choosePrize}
      />
      {focus.active ? null : (
        <WinnersPanel event={event} canVoid={!isBusy} onVoid={setVoiding} />
      )}

      <ParticipantsDialog
        event={event}
        characters={charactersQuery.data ?? []}
        open={dialog.kind === "participants"}
        onOpenChange={(open) => !open && close()}
      />
      {selected ? (
        <EntrantsDialog
          event={event}
          prize={selected}
          open={dialog.kind === "entrants"}
          onOpenChange={(open) => !open && close()}
        />
      ) : null}
      <PrizeFormDialog
        eventId={event.id}
        open={dialog.kind === "prize"}
        prize={dialog.kind === "prize" ? dialog.prize : null}
        onOpenChange={(open) => !open && close()}
      />
      <ConfirmDeleteDialog
        open={dialog.kind === "delete-prize"}
        onOpenChange={(open) => !open && close()}
        title="Xoá hạng mục?"
        description={
          dialog.kind === "delete-prize"
            ? `Xoá hạng mục ${dialog.prize.name}. Chỉ xoá được hạng mục chưa có vòng nào.`
            : undefined
        }
        submitLabel="Xoá"
        pendingLabel="Đang xoá..."
        fallbackError="Không xoá được hạng mục."
        successMessage={
          dialog.kind === "delete-prize"
            ? `Đã xoá hạng mục ${dialog.prize.name}.`
            : null
        }
        run={async () => {
          if (dialog.kind !== "delete-prize") return;
          await deletePrize.mutateAsync({ id: event.id, prizeId: dialog.prize.id });
        }}
      />
      <VoidRoundDialog
        eventId={event.id}
        round={voiding}
        onOpenChange={(open) => !open && setVoiding(null)}
      />
    </div>
  );
}
